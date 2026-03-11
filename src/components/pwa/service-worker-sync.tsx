'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/dexie'
import { requestPersistentStorage } from '@/lib/maps/tile-cache'
import {
  parseFallbackSettingsSnapshot,
  readFallbackSettingsSnapshot,
  subscribeToFallbackSettings,
} from '@/lib/settings/page-helpers'

export function ServiceWorkerSync() {
  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const previousTileCachingEnabled = useRef<boolean | null>(null)
  const fallbackSettingsSnapshot = useSyncExternalStore(
    subscribeToFallbackSettings,
    readFallbackSettingsSnapshot,
    () => null
  )
  const fallbackTileCachingEnabled =
    parseFallbackSettingsSnapshot(fallbackSettingsSnapshot)?.tileCachingEnabled ?? null
  const tileCachingEnabled =
    settings?.tileCachingEnabled ?? fallbackTileCachingEnabled ?? null

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

        if (tileCachingEnabled !== null) {
          worker?.postMessage({
            type: 'SET_TILE_CACHING',
            enabled: tileCachingEnabled,
            clearStoredTiles:
              previousTileCachingEnabled.current === true && tileCachingEnabled === false,
          })
          previousTileCachingEnabled.current = tileCachingEnabled
        }
      } catch {
        // Service worker registration is optional for the app to function.
      }
    }

    void registerServiceWorker()

    return () => {
      isCancelled = true
    }
  }, [tileCachingEnabled])

  useEffect(() => {
    if (!navigator.serviceWorker) return

    function syncController() {
      if (tileCachingEnabled === null) {
        return
      }

      navigator.serviceWorker.controller?.postMessage({
        type: 'SET_TILE_CACHING',
        enabled: tileCachingEnabled,
        clearStoredTiles:
          previousTileCachingEnabled.current === true && tileCachingEnabled === false,
      })
      previousTileCachingEnabled.current = tileCachingEnabled
    }

    navigator.serviceWorker.addEventListener('controllerchange', syncController)
    syncController()

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', syncController)
    }
  }, [tileCachingEnabled])

  useEffect(() => {
    if (tileCachingEnabled !== true) {
      return
    }

    void requestPersistentStorage()
  }, [tileCachingEnabled])

  return null
}
