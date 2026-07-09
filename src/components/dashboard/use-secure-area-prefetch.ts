'use client'

import { useRef, useState } from 'react'
import { saveAppSettings } from '@/lib/db/repositories/settings'
import {
  MAX_PREFETCH_TILES,
  buildSecureAreaPrefetchUrls,
  prefetchTileUrls,
} from '@/lib/maps/tile-cache'
import { formatCurrentPositionError } from '@/lib/settings/page-helpers'
import type { MapBaseLayer } from '@/types/domain'

type SecureAreaStatus = 'idle' | 'locating' | 'prefetching' | 'done' | 'error'

type UseSecureAreaPrefetchOptions = {
  baseLayer: MapBaseLayer
  tileCachingEnabled: boolean
}

/**
 * One-tap "secure the map around me for today": locate the user, then prefetch a
 * walking-radius tile area around them. Reuses the same prefetch primitives as
 * the settings panel, and turns tile caching on if it was off — tapping this is
 * an explicit request for offline maps here, so the cache must actually serve.
 */
export function useSecureAreaPrefetch({
  baseLayer,
  tileCachingEnabled,
}: UseSecureAreaPrefetchOptions) {
  const [status, setStatus] = useState<SecureAreaStatus>('idle')
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const isBusy = status === 'locating' || status === 'prefetching'

  async function runPrefetch(latitude: number, longitude: number) {
    try {
      setStatus('prefetching')
      setMessage('Kartenbereich wird gesichert …')

      let cacheJustEnabled = false
      if (!tileCachingEnabled) {
        await saveAppSettings({ tileCachingEnabled: true })
        cacheJustEnabled = true
      }

      const urls = buildSecureAreaPrefetchUrls([baseLayer], latitude, longitude)

      if (urls.length === 0) {
        setStatus('error')
        setMessage('Für diesen Standort konnten keine Tiles ermittelt werden.')
        return
      }

      if (urls.length > MAX_PREFETCH_TILES) {
        setStatus('error')
        setMessage('Bereich zu groß. Bitte die Detailsicherung in den Einstellungen nutzen.')
        return
      }

      setProgress({ completed: 0, total: urls.length })
      abortControllerRef.current?.abort()
      const abortController = new AbortController()
      abortControllerRef.current = abortController
      const result = await prefetchTileUrls(urls, {
        signal: abortController.signal,
        onProgress: (completed, total) => setProgress({ completed, total }),
      })

      // prefetchTileUrls dispatches TILE_CACHE_CHANGED_EVENT, which the status
      // strip listens for to refresh its tile count — no need to read it here.
      const prefix = cacheJustEnabled ? 'Tile-Cache aktiviert. ' : ''

      if (result.cancelled) {
        setStatus('idle')
        setMessage(`${prefix}Sicherung abgebrochen (${result.succeeded}/${result.total} Tiles).`)
        return
      }

      if (result.failed === 0) {
        setStatus('done')
        setMessage(`${prefix}Kartenbereich gesichert (${result.succeeded} Tiles).`)
        return
      }

      if (result.succeeded > 0) {
        setStatus('done')
        setMessage(`${prefix}Teilweise gesichert (${result.succeeded}/${result.total} Tiles).`)
        return
      }

      setStatus('error')
      setMessage('Keine Tiles gesichert. Netzverbindung prüfen.')
    } catch {
      setStatus('error')
      setMessage('Sicherung fehlgeschlagen. Netzverbindung prüfen.')
    } finally {
      abortControllerRef.current = null
      setProgress(null)
    }
  }

  function cancelPrefetch() {
    abortControllerRef.current?.abort()
    setMessage('Sicherung wird abgebrochen …')
  }

  function secureCurrentArea() {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatus('error')
      setMessage('Standort ist auf diesem Gerät nicht verfügbar.')
      return
    }

    setStatus('locating')
    setMessage('Standort wird ermittelt …')
    setProgress(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void runPrefetch(position.coords.latitude, position.coords.longitude)
      },
      (error) => {
        setStatus('error')
        setMessage(formatCurrentPositionError(error))
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    )
  }

  return { status, message, progress, isBusy, secureCurrentArea, cancelPrefetch }
}
