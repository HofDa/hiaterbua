import { useEffect, useRef, useState } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type {
  Map as MapLibreMap,
  Marker,
} from 'maplibre-gl'
import { registerGrazingSessionMapSetup } from '@/lib/maps/grazing-session-map-setup'
import { createDefaultMarker, createRasterMap } from '@/lib/maps/maplibre-runtime'
import type { EditableTrackPoint } from '@/lib/maps/grazing-session-map-helpers'
import { nowIso } from '@/lib/utils/time'

type UseGrazingSessionMapSetupOptions = {
  editingSessionIdRef: MutableRefObject<string | null>
  selectedEditTrackpointIndexRef: MutableRefObject<number | null>
  isAddingEditTrackpointRef: MutableRefObject<boolean>
  positionAccuracyRef: MutableRefObject<number | null>
  setEditTrackpoints: Dispatch<SetStateAction<EditableTrackPoint[]>>
  setSelectedEditTrackpointIndex: Dispatch<SetStateAction<number | null>>
  setIsAddingEditTrackpoint: Dispatch<SetStateAction<boolean>>
  setActionError: Dispatch<SetStateAction<string>>
}

export function useGrazingSessionMapSetup({
  editingSessionIdRef,
  selectedEditTrackpointIndexRef,
  isAddingEditTrackpointRef,
  positionAccuracyRef,
  setEditTrackpoints,
  setSelectedEditTrackpointIndex,
  setIsAddingEditTrackpoint,
  setActionError,
}: UseGrazingSessionMapSetupOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function setupMap() {
      if (!containerRef.current || mapRef.current) return

      const maplibre = await import('maplibre-gl')
      if (cancelled || !containerRef.current) return

      const map = createRasterMap(maplibre, containerRef.current)

      map.on('load', () => {
        if (cancelled) return
        registerGrazingSessionMapSetup(map, {
          onMapClick: (event) => {
            if (editingSessionIdRef.current && isAddingEditTrackpointRef.current) {
              setEditTrackpoints((currentPoints) => [
                ...currentPoints,
                {
                  lat: event.lngLat.lat,
                  lon: event.lngLat.lng,
                  timestamp: nowIso(),
                  accuracyM: positionAccuracyRef.current,
                  speedMps: null,
                  headingDeg: null,
                },
              ])
              setIsAddingEditTrackpoint(false)
              setActionError('')
              return
            }

            if (
              editingSessionIdRef.current &&
              selectedEditTrackpointIndexRef.current !== null
            ) {
              setEditTrackpoints((currentPoints) =>
                currentPoints.map((point, index) =>
                  index === selectedEditTrackpointIndexRef.current
                    ? { ...point, lat: event.lngLat.lat, lon: event.lngLat.lng }
                    : point
                )
              )
              setSelectedEditTrackpointIndex(null)
              setActionError('')
            }
          },
          onSelectedTrackpointClick: (index) => {
            setSelectedEditTrackpointIndex(index)
          },
        })

        setMapReady(true)
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
    editingSessionIdRef,
    isAddingEditTrackpointRef,
    positionAccuracyRef,
    selectedEditTrackpointIndexRef,
    setActionError,
    setEditTrackpoints,
    setIsAddingEditTrackpoint,
    setSelectedEditTrackpointIndex,
  ])

  return {
    containerRef,
    mapRef,
    markerRef,
    mapReady,
  }
}
