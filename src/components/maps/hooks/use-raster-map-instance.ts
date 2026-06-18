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

    async function setupMap() {
      if (!containerElement || mapRef.current) return

      const maplibre = await import('maplibre-gl')
      if (cancelled || !containerElement) return

      const map = createRasterMap(maplibre, containerElement)

      map.on('load', () => {
        if (cancelled) return
        registerLayers(map)
        setMapReady(true)

        requestAnimationFrame(() => {
          map.resize()
          window.setTimeout(() => map.resize(), 250)
          window.setTimeout(() => map.resize(), 800)
        })
      })

      mapRef.current = map
      markerRef.current = createDefaultMarker(maplibre)
    }

    void setupMap()

    return () => {
      cancelled = true
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
