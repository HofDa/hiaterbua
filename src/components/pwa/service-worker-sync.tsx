'use client'

import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/dexie'
import { defaultAppSettings } from '@/lib/settings/defaults'

export function ServiceWorkerSync() {
  const settings = useLiveQuery(() => db.settings.get('app'), [])

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    let isCancelled = false

    async function registerServiceWorker() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        if (isCancelled) return

        const worker =
          registration.active ??
          registration.waiting ??
          registration.installing ??
          navigator.serviceWorker.controller

        worker?.postMessage({
          type: 'SET_TILE_CACHING',
          enabled: (settings ?? defaultAppSettings).tileCachingEnabled,
        })
      } catch {
        // Service worker registration is optional for the app to function.
      }
    }

    void registerServiceWorker()

    return () => {
      isCancelled = true
    }
  }, [settings])

  useEffect(() => {
    if (!navigator.serviceWorker) return

    function syncController() {
      navigator.serviceWorker.controller?.postMessage({
        type: 'SET_TILE_CACHING',
        enabled: (settings ?? defaultAppSettings).tileCachingEnabled,
      })
    }

    navigator.serviceWorker.addEventListener('controllerchange', syncController)
    syncController()

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', syncController)
    }
  }, [settings])

  return null
}
