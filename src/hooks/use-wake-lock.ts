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
    let requesting = false

    const acquire = async () => {
      // The lock can only be held while the page is visible; the OS releases it
      // automatically when the tab is hidden or the screen turns off.
      if (cancelled || requesting || document.visibilityState !== 'visible') return
      if (sentinel && !sentinel.released) return

      requesting = true
      try {
        const next = await navigator.wakeLock.request('screen')
        if (cancelled) {
          await next.release()
          return
        }
        sentinel = next
        // The system can also drop the lock while the page stays visible
        // (battery saver toggled, power-source change). Re-acquire right away
        // instead of waiting for the next visibility change.
        next.addEventListener('release', () => {
          if (sentinel === next) sentinel = null
          if (!cancelled && document.visibilityState === 'visible') void acquire()
        })
      } catch {
        // Battery saver, missing user gesture, etc. — retried on the next
        // interaction or visibility change.
      } finally {
        requesting = false
      }
    }

    const handleVisibilityChange = () => {
      // Re-acquire after returning to the page, since the lock is dropped on hide.
      if (document.visibilityState === 'visible') {
        void acquire()
      }
    }

    // Some browsers refuse the request until the page has seen a user gesture;
    // any tap is a cheap moment to retry when the lock is not held.
    const handleInteraction = () => {
      if (!sentinel || sentinel.released) void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('pointerdown', handleInteraction, { passive: true })

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('pointerdown', handleInteraction)
      void sentinel?.release()
      sentinel = null
    }
  }, [active])
}
