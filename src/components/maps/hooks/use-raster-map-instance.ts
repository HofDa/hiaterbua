import { useCallback, useEffect, useRef, useState } from 'react'
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import { createDefaultMarker, createRasterMap } from '@/lib/maps/maplibre-runtime'
import { recordFieldDiagnostic } from '@/lib/diagnostics/field-diagnostics'

type UseRasterMapInstanceOptions = {
  // Called once, after the map's `load` event, to register the feature's
  // sources/layers/interaction handlers. Must be stable (wrap in useCallback) so
  // the map isn't torn down and recreated on every render.
  registerLayers: (map: MapLibreMap) => void
}

// Owns the raster MapLibre instance lifecycle shared by every map screen:
// async creation, the post-load resize sequence, a ResizeObserver, and
// teardown. Feature hooks supply only their own `registerLayers` callback.
export function useRasterMapInstance({ registerLayers }: UseRasterMapInstanceOptions) {
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [mapLoadState, setMapLoadState] = useState<'loading' | 'retrying' | 'ready' | 'failed'>(
    'loading'
  )
  const [mapWarning, setMapWarning] = useState('')
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerElement(node)
  }, [])

  useEffect(() => {
    let cancelled = false
    // The post-load resize sequence schedules a frame and two timers; track them
    // so teardown can cancel any that are still pending. Otherwise unmounting
    // within ~800ms of `load` fires `resize()` on an already-removed map.
    let loadResizeFrame = 0
    const loadResizeTimers: ReturnType<typeof setTimeout>[] = []

    // A failed chunk load (e.g. signal drop before the map bundle was cached)
    // must not leave the map blank forever — retry when the connection returns
    // or after a short backoff. Failed dynamic imports are not cached by the
    // module system, so re-attempting re-issues the request.
    function waitForImportRetrySignal() {
      return new Promise<void>((resolve) => {
        let timer: ReturnType<typeof setTimeout> | null = null
        const settle = () => {
          window.removeEventListener('online', settle)
          if (timer !== null) clearTimeout(timer)
          resolve()
        }
        timer = setTimeout(settle, 5_000)
        window.addEventListener('online', settle)
      })
    }

    async function loadMapLibre() {
      for (;;) {
        try {
          return await import('maplibre-gl')
        } catch (error) {
          if (cancelled) return null
          recordFieldDiagnostic({
            type: 'map_runtime_error',
            level: 'warning',
            message: 'Kartenmodul konnte nicht geladen werden.',
            details: error,
          })
          setMapLoadState('retrying')
          setMapWarning('Kartenmodul konnte noch nicht geladen werden. Feldfunktionen bleiben nutzbar.')
          await waitForImportRetrySignal()
          if (cancelled) return null
        }
      }
    }

    async function setupMap() {
      if (!containerElement || mapRef.current) return

      const maplibre = await loadMapLibre()
      if (!maplibre || cancelled || !containerElement) return

      const map = createRasterMap(maplibre, containerElement)

      map.on('load', () => {
        if (cancelled) return
        registerLayers(map)
        setMapReady(true)
        setMapLoadState('ready')

        loadResizeFrame = requestAnimationFrame(() => {
          map.resize()
          loadResizeTimers.push(setTimeout(() => map.resize(), 250))
          loadResizeTimers.push(setTimeout(() => map.resize(), 800))
        })
      })

      map.on('error', (event) => {
        if (cancelled) return
        recordFieldDiagnostic({
          type: 'map_tile_or_network_error',
          level: 'warning',
          message: 'Kartenfehler oder fehlende Kartentiles.',
          details: event,
        })
        setMapWarning('Kartentiles fehlen oder konnten nicht geladen werden. Dokumentation bleibt möglich.')
      })

      mapRef.current = map
      markerRef.current = createDefaultMarker(maplibre)
    }

    void setupMap()

    return () => {
      cancelled = true
      cancelAnimationFrame(loadResizeFrame)
      loadResizeTimers.forEach((timer) => clearTimeout(timer))
      markerRef.current?.remove()
      markerRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [containerElement, registerLayers])

  useEffect(() => {
    if (!containerElement || mapReady) return

    const timeoutId = window.setTimeout(() => {
      setMapLoadState((current) => (current === 'ready' ? current : 'failed'))
      recordFieldDiagnostic({
        type: 'map_runtime_error',
        level: 'warning',
        message: 'Karte wurde nicht rechtzeitig bereit.',
        details: { timeoutMs: 12_000 },
      })
      setMapWarning('Karte ist nicht verfügbar. Nutze die Feldsteuerung ohne sichtbare Karte.')
    }, 12_000)

    return () => window.clearTimeout(timeoutId)
  }, [containerElement, mapReady])

  useEffect(() => {
    if (!mapReady || !containerElement || typeof ResizeObserver === 'undefined') {
      return
    }

    let frameId = 0

    const resizeMap = () => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(() => {
        mapRef.current?.resize()
      })
    }

    const observer = new ResizeObserver(() => {
      resizeMap()
    })

    observer.observe(containerElement)
    resizeMap()

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
    }
  }, [containerElement, mapReady])

  return {
    containerRef,
    mapRef,
    markerRef,
    mapReady,
    mapLoadState,
    mapWarning,
  }
}
