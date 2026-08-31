import { logError } from '@/lib/utils/log'

// Files handed to the installed PWA via the manifest `file_handlers` /
// `window.launchQueue` API (Chromium-only). The launch can arrive before the
// /export page (or even React) has mounted, so files are parked in a
// module-level queue and consumers are notified via a window event —
// mirroring the TILE_CACHE_CHANGED_EVENT pattern in `src/lib/maps/tile-cache.ts`.

export const LAUNCH_FILES_CHANGED_EVENT = 'hirtenapp:launch-files-changed'

// Minimal ambient typings for the (Chromium-only) Launch Handler API — it is
// not part of the standard TS DOM lib yet.
type LaunchParams = {
  readonly files?: readonly FileSystemFileHandle[]
}

type LaunchQueue = {
  setConsumer(consumer: (launchParams: LaunchParams) => void): void
}

declare global {
  interface Window {
    launchQueue?: LaunchQueue
  }
}

let pendingLaunchFiles: File[] = []
let didInitLaunchQueue = false

function dispatchLaunchFilesChanged() {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent(LAUNCH_FILES_CHANGED_EVENT))
}

/**
 * Parks launch files until a consumer (the import card on /export) picks them
 * up. Files enqueued before anyone subscribes stay queued — enqueue-before-
 * subscribe is the normal case, because the launch fires during app startup.
 */
export function enqueueLaunchFiles(files: readonly File[]) {
  if (files.length === 0) {
    return
  }

  pendingLaunchFiles = [...pendingLaunchFiles, ...files]
  dispatchLaunchFilesChanged()
}

/**
 * Hands over all pending launch files and clears the queue (consume-once):
 * a second call returns an empty array until new files arrive.
 */
export function consumePendingLaunchFiles(): File[] {
  if (pendingLaunchFiles.length === 0) {
    return []
  }

  const files = pendingLaunchFiles
  pendingLaunchFiles = []
  return files
}

/**
 * Notifies `listener` whenever new launch files are enqueued. Returns an
 * unsubscribe function. Safe to call without `window` (no-op).
 */
export function subscribeToLaunchFiles(listener: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  window.addEventListener(LAUNCH_FILES_CHANGED_EVENT, listener)
  return () => {
    window.removeEventListener(LAUNCH_FILES_CHANGED_EVENT, listener)
  }
}

/**
 * Registers the launchQueue consumer. Progressive enhancement: on browsers
 * without `window.launchQueue` (Firefox, Safari, non-installed tabs) this is
 * a silent no-op — zero behavior change, zero console errors.
 */
export function initLaunchQueueFileHandling() {
  if (typeof window === 'undefined' || didInitLaunchQueue) {
    return
  }

  const launchQueue = window.launchQueue
  if (!launchQueue || typeof launchQueue.setConsumer !== 'function') {
    return
  }

  didInitLaunchQueue = true

  launchQueue.setConsumer((launchParams) => {
    void (async () => {
      const handles = launchParams?.files ?? []
      if (handles.length === 0) {
        return
      }

      const files: File[] = []
      for (const handle of handles) {
        try {
          files.push(await handle.getFile())
        } catch (error) {
          // A single unreadable handle must not break the launch flow.
          logError('launch-files.launchQueueConsumer', error)
        }
      }

      enqueueLaunchFiles(files)
    })()
  })
}
