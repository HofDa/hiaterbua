import { SessionNotRecordingError } from '@/lib/db/repositories/sessions'
import type { GpsTrackPosition } from '@/lib/maps/position-types'
import type { TrackPoint } from '@/types/domain'

/**
 * The write-behind queue for GPS trackpoints.
 *
 * GPS fixes arrive while IndexedDB writes are still in flight, so points are
 * queued and drained in order. The queue is the piece that makes pause and stop
 * atomic with respect to recording: it can be closed to new points, drained
 * under the session recording lock, and — crucially — it never discards a point
 * just because a write failed or the session on screen changed.
 */

export type PendingTrackpoint = {
  /**
   * Carried explicitly rather than read from a ref at flush time, so a point is
   * always attributed to the session that produced it even if the app has since
   * moved on to another one.
   */
  sessionId: string
  position: GpsTrackPosition
}

export type AppendTrackpointResult = {
  trackPoint: TrackPoint
  nextSeq: number
  lastTimestamp: number
} | null

export type TrackpointQueueDeps = {
  appendTrackpoint: (params: {
    sessionId: string
    lastTimestamp: number | null
    nextPosition: GpsTrackPosition
  }) => Promise<AppendTrackpointResult>
  withLock: <T>(sessionId: string, run: () => Promise<T> | T) => Promise<T>
  getLastTimestamp: () => number | null
  onPersisted: (
    pending: PendingTrackpoint,
    result: NonNullable<AppendTrackpointResult>
  ) => void
  onWriteFailed: (pending: PendingTrackpoint, error: unknown, pendingCount: number) => void
  onRejected: (pending: PendingTrackpoint, error: SessionNotRecordingError) => void
  onHealthy: () => void
}

export const PENDING_FLUSH_FAILED_MESSAGE =
  'Ausstehende GPS-Punkte konnten nicht gespeichert werden. Der Weidegang bleibt unverändert, damit keine Punkte verloren gehen.'

/**
 * Holds the pending points and the intake gate. The side effects (writing,
 * locking, reporting) are supplied per call rather than captured at
 * construction, so the React hook can build them from refs at call time instead
 * of during render.
 */
export function createTrackpointQueue() {
  let pending: PendingTrackpoint[] = []
  let isDraining = false
  let isAcceptingPositions = true

  /**
   * Writes queued points in order until the queue empties or one fails.
   * Callers must hold the session recording lock.
   */
  async function drain(
    deps: TrackpointQueueDeps
  ): Promise<{ drained: boolean; error: unknown }> {
    if (isDraining) {
      // A concurrent drain owns the queue; report the queue's current state
      // rather than interleaving two writers over the same array.
      return { drained: pending.length === 0, error: null }
    }
    isDraining = true

    try {
      while (pending.length > 0) {
        const next = pending[0]

        try {
          const result = await deps.appendTrackpoint({
            sessionId: next.sessionId,
            lastTimestamp: deps.getLastTimestamp(),
            nextPosition: next.position,
          })

          // Persisted, or skipped as a duplicate — either way it is settled.
          pending.shift()

          if (result) {
            deps.onPersisted(next, result)
          }

          deps.onHealthy()
        } catch (error) {
          if (error instanceof SessionNotRecordingError) {
            // The session no longer accepts points (stopped in another tab, or
            // finished by session recovery). Retrying can never succeed and
            // would block every later point behind it — drop it, but loudly.
            pending.shift()
            deps.onRejected(next, error)
            continue
          }

          // Transient write failure: keep the point queued so a full storage or
          // a locked database doesn't punch a hole in the recorded track.
          deps.onWriteFailed(next, error, pending.length)
          return { drained: false, error }
        }
      }

      return { drained: true, error: null }
    } finally {
      isDraining = false
    }
  }

  return {
    /** Queues a fix, unless intake is closed for a pause/stop in flight. */
    enqueue(sessionId: string, position: GpsTrackPosition): boolean {
      if (!isAcceptingPositions) return false

      pending.push({ sessionId, position })
      return true
    },

    /** Best-effort drain under the lock; failures stay queued for the retry timer. */
    async flush(fallbackSessionId: string | null, deps: TrackpointQueueDeps): Promise<void> {
      const sessionId = pending[0]?.sessionId ?? fallbackSessionId
      if (!sessionId) return

      await deps.withLock(sessionId, () => drain(deps))
    },

    /**
     * Drain for a caller that already holds the lock. Throws when the queue
     * could not be emptied, so pause/stop abort with the points still queued
     * instead of persisting a transition that silently omits them.
     */
    async flushAssumingLock(deps: TrackpointQueueDeps): Promise<void> {
      const { drained, error } = await drain(deps)
      if (drained) return

      throw error instanceof Error ? error : new Error(PENDING_FLUSH_FAILED_MESSAGE)
    },

    /** Closes intake ahead of a pause/stop transition. */
    suspendIntake() {
      isAcceptingPositions = false
    },

    /** Reopens intake — after a resume, or after a transition failed. */
    resumeIntake() {
      isAcceptingPositions = true
    },

    isAcceptingPositions() {
      return isAcceptingPositions
    },

    size() {
      return pending.length
    },

    peekSessionId() {
      return pending[0]?.sessionId ?? null
    },

    /** Test/diagnostic view of what is still waiting to be written. */
    snapshot(): PendingTrackpoint[] {
      return [...pending]
    },

    reset() {
      pending = []
      isAcceptingPositions = true
    },
  }
}

export type TrackpointQueue = ReturnType<typeof createTrackpointQueue>
