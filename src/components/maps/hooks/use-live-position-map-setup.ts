import { useCallback } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { registerLivePositionMapSetup } from '@/lib/maps/live-position-map-setup'
import { useRasterMapInstance } from '@/components/maps/hooks/use-raster-map-instance'
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
  const registerLayers = useCallback(
    (map: MapLibreMap) => {
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
    },
    [
      draftPointsLengthRef,
      editingEnclosureIdRef,
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
    ]
  )

  return useRasterMapInstance({ registerLayers })
}
