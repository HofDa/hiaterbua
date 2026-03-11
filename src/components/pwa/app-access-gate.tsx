'use client'

import { useEffect, useSyncExternalStore } from 'react'
import {
  clearLockedAccessCaches,
  getLockedCachePurgeDelayMs,
  isAccessAuthorized,
  subscribeToAccessState,
} from '@/lib/security/app-access'

function subscribeToHydration() {
  return () => {}
}

export function AppAccessGate() {
  const isReady = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false
  )
  const isAuthorized = useSyncExternalStore(
    subscribeToAccessState,
    isAccessAuthorized,
    () => false
  )

  useEffect(() => {
    if (!isReady || isAuthorized) {
      return
    }

    let cancelled = false
    let timeoutId: number | null = null

    function scheduleCacheCleanup() {
      if (cancelled) {
        return
      }

      const delayMs = getLockedCachePurgeDelayMs()

      timeoutId = window.setTimeout(async () => {
        await clearLockedAccessCaches()

        if (!cancelled) {
          scheduleCacheCleanup()
        }
      }, delayMs)
    }

    scheduleCacheCleanup()

    return () => {
      cancelled = true

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [isAuthorized, isReady])

  return null
}
