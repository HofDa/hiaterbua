/**
 * The exclusive lock that serializes everything touching one grazing session's
 * recording: GPS trackpoint appends and the pause/resume/stop transitions.
 *
 * Without it a GPS fix accepted microseconds before "Stop" could land in
 * IndexedDB *after* the stop transaction computed its metrics, leaving a
 * finished session whose distance and duration silently exclude the last point.
 *
 * Web Locks serialize across tabs, which is what a PWA reopened in a second tab
 * needs. When they are unavailable (older browsers, and the Node test
 * environment) an in-process queue still guarantees ordering within this
 * context — a weaker but never-worse guarantee than the previous no-lock path.
 */

type LockManagerLike = {
  request<T>(
    name: string,
    options: { mode: 'exclusive' },
    callback: () => T | Promise<T>
  ): Promise<T>
}

export function getSessionRecordingLockName(sessionId: string): string {
  return `pastore:grazing-session:${sessionId}:recording`
}

function getLockManager(): LockManagerLike | null {
  if (typeof navigator === 'undefined') return null
  return (navigator as Navigator & { locks?: LockManagerLike }).locks ?? null
}

// Tail of the pending chain per lock name. Only used on the fallback path.
const inProcessLockChains = new Map<string, Promise<unknown>>()

function withInProcessLock<T>(name: string, run: () => Promise<T> | T): Promise<T> {
  const previous = inProcessLockChains.get(name) ?? Promise.resolve()

  // Run after the previous holder settles, whether it resolved or rejected: one
  // failed append must not wedge the queue for every later caller.
  const result = Promise.resolve(previous).then(run, run)
  const settled = result.then(
    () => undefined,
    () => undefined
  )

  inProcessLockChains.set(name, settled)

  void settled.then(() => {
    // Drop the entry once this is the last queued holder, so a long-lived tab
    // does not accumulate one promise per session it has ever recorded.
    if (inProcessLockChains.get(name) === settled) {
      inProcessLockChains.delete(name)
    }
  })

  return result
}

/**
 * Runs `run` while holding the session's recording lock. Nesting two of these
 * for the same session would deadlock on the Web Locks path — callers that
 * already hold the lock must use the `…AssumingLock` variants instead.
 */
export function withSessionRecordingLock<T>(
  sessionId: string,
  run: () => Promise<T> | T
): Promise<T> {
  const name = getSessionRecordingLockName(sessionId)
  const locks = getLockManager()

  if (!locks) {
    return withInProcessLock(name, run)
  }

  return locks.request(name, { mode: 'exclusive' }, run)
}
