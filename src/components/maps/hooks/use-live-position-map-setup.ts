import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type {
  Map as MapLibreMap,
  Marker,
} from 'maplibre-gl'
import { registerLivePositionMapSetup } from '@/lib/maps/live-position-map-setup'
import { createDefaultMarker, createRasterMap } from '@/lib/maps/maplibre-runtime'
import type { DraftPoint } from '@/lib/maps/live-position-map-helpers'

type UseLivePositionMapSetupOptions = {
  openEnclosureDetailsRef: MutableRefObject<(enclosureId: string) => void>
  isDrawingRef: MutableRefObject<boolean>
  draftPointsLengthRef: MutableRefObject<number>
  editingEnclosureIdRef: MutableRefObject<string | null>
  selectedEditPointIndexRef: MutableRefObject<number | null>
  isAddingEditPointRef: MutableRefObject<boolean>
  setDraftPoints: Dispatch<SetStateAction<DraftPoint[]>>
  setSelectedWalkPointIndex: Dispatch<SetStateAction<number | null>>
  setEditGeometryPoints: Dispatch<SetStateAction<DraftPoint[]>>
  setSelectedEditPointIndex: Dispatch<SetStateAction<number | null>>
  setIsAddingEditPoint: Dispatch<SetStateAction<boolean>>
  setEditError: Dispatch<SetStateAction<string>>
}

export function useLivePositionMapSetup({
  openEnclosureDetailsRef,
  isDrawingRef,
  draftPointsLengthRef,
  editingEnclosureIdRef,
  selectedEditPointIndexRef,
  isAddingEditPointRef,
  setDraftPoints,
  setSelectedWalkPointIndex,
  setEditGeometryPoints,
  setSelectedEditPointIndex,
  setIsAddingEditPoint,
  setEditError,
}: UseLivePositionMapSetupOptions) {
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
        registerLivePositionMapSetup(map, {
          onMapClick: (event) => {
            if (editingEnclosureIdRef.current && isAddingEditPointRef.current) {
              setEditGeometryPoints((currentPoints) => [
                ...currentPoints,
                {
                  lat: event.lngLat.lat,
                  lon: event.lngLat.lng,
                },
              ])
              setIsAddingEditPoint(false)
              setEditError('')
              return
            }

            if (
              editingEnclosureIdRef.current &&
              selectedEditPointIndexRef.current !== null
            ) {
              setEditGeometryPoints((currentPoints) =>
                currentPoints.map((point, index) =>
                  index === selectedEditPointIndexRef.current
                    ? {
                        lat: event.lngLat.lat,
                        lon: event.lngLat.lng,
                      }
                    : point
                )
              )
              setSelectedEditPointIndex(null)
              setEditError('')
              return
            }

            setDraftPoints((currentPoints) => {
              if (!isDrawingRef.current) return currentPoints

              return [
                ...currentPoints,
                {
                  lat: event.lngLat.lat,
                  lon: event.lngLat.lng,
                },
              ]
            })
          },
          onSavedEnclosureSelect: (enclosureId) => {
            if (
              isDrawingRef.current ||
              draftPointsLengthRef.current > 0 ||
              editingEnclosureIdRef.current
            ) {
              return
            }

            openEnclosureDetailsRef.current(enclosureId)
          },
          onSelectedEnclosureSelect: (enclosureId) => {
            if (
              isDrawingRef.current ||
              draftPointsLengthRef.current > 0 ||
              editingEnclosureIdRef.current
            ) {
              return
            }

            openEnclosureDetailsRef.current(enclosureId)
          },
          onWalkPointSelect: (index) => {
            setSelectedWalkPointIndex(index)
          },
          onEditPointSelect: (index) => {
            setSelectedEditPointIndex(index)
          },
        })

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
  }, [
    containerElement,
    editingEnclosureIdRef,
    draftPointsLengthRef,
    isAddingEditPointRef,
    isDrawingRef,
    openEnclosureDetailsRef,
    selectedEditPointIndexRef,
    setDraftPoints,
    setEditError,
    setEditGeometryPoints,
    setIsAddingEditPoint,
    setSelectedEditPointIndex,
    setSelectedWalkPointIndex,
  ])

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
