import { useCallback } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { registerGrazingSessionMapSetup } from '@/lib/maps/grazing-session-map-setup'
import { useRasterMapInstance } from '@/components/maps/hooks/use-raster-map-instance'
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
  const registerLayers = useCallback(
    (map: MapLibreMap) => {
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
    },
    [
      editingSessionIdRef,
      isAddingEditTrackpointRef,
      positionAccuracyRef,
      selectedEditTrackpointIndexRef,
      setActionError,
      setEditTrackpoints,
      setIsAddingEditTrackpoint,
      setSelectedEditTrackpointIndex,
    ]
  )

  return useRasterMapInstance({ registerLayers })
}
