import { useCallback, useEffect, useRef, useState } from 'react'
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import { createDefaultMarker, createRasterMap } from '@/lib/maps/maplibre-runtime'

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

    async function setupMap() {
      if (!containerElement || mapRef.current) return

      const maplibre = await import('maplibre-gl')
      if (cancelled || !containerElement) return

      const map = createRasterMap(maplibre, containerElement)

      map.on('load', () => {
        if (cancelled) return
        registerLayers(map)
        setMapReady(true)

        loadResizeFrame = requestAnimationFrame(() => {
          map.resize()
          loadResizeTimers.push(setTimeout(() => map.resize(), 250))
          loadResizeTimers.push(setTimeout(() => map.resize(), 800))
        })
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
  }
}
