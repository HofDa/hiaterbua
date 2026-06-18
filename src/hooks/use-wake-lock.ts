'use client'

import { useEffect } from 'react'

// Keeps the screen awake while `active` is true. During an active GPS recording
// this prevents the OS from dimming/locking the screen, which would otherwise
// suspend `watchPosition` and silently stop the track. A PWA cannot record in
// the true background, so keeping the screen awake is the realistic mitigation.
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return
    }

    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const acquire = async () => {
      // The lock can only be held while the page is visible; the OS releases it
      // automatically when the tab is hidden or the screen turns off.
      if (cancelled || document.visibilityState !== 'visible') return
      if (sentinel && !sentinel.released) return

      try {
        sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          await sentinel.release()
          sentinel = null
        }
      } catch {
        // Battery saver, missing user gesture, etc. — nothing actionable.
      }
    }

    const handleVisibilityChange = () => {
      // Re-acquire after returning to the page, since the lock is dropped on hide.
      if (document.visibilityState === 'visible') {
        void acquire()
      }
    }

    void acquire()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      void sentinel?.release()
      sentinel = null
    }
  }, [active])
}
