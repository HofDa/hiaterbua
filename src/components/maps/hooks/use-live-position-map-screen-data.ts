import { useLatestValueRef } from '@/components/maps/hooks/use-latest-value-ref'
import { useLivePositionMapData } from '@/components/maps/hooks/use-live-position-map-data'
import { useLivePositionMapRuntime } from '@/components/maps/hooks/use-live-position-map-runtime'
import type { PositionData } from '@/components/maps/live-position-map-types'
import type { LivePositionMapState } from '@/components/maps/hooks/use-live-position-map-state'
import { defaultAppSettings } from '@/lib/settings/defaults'

export function useLivePositionMapScreenData(state: LivePositionMapState) {
  const { refs, gps, draw, walk, selection, edit } = state

  const data = useLivePositionMapData({
    selectedEnclosureId: selection.selectedEnclosureId,
    selectedSurveyAreaId: selection.selectedSurveyAreaId,
    selectedWalkPointIndex: walk.selectedWalkPointIndex,
    enclosureListFilter: selection.enclosureListFilter,
    draftPoints: draw.draftPoints,
    walkPoints: walk.walkPoints,
    editGeometryPoints: edit.editGeometryPoints,
  })

  const effectiveSettings = data.settings ?? defaultAppSettings
  const settingsRef = useLatestValueRef(effectiveSettings)
  const buildPositionRef = useLatestValueRef(
    (nextPosition: GeolocationPosition): PositionData => ({
      latitude: nextPosition.coords.latitude,
      longitude: nextPosition.coords.longitude,
      accuracy: nextPosition.coords.accuracy,
      timestamp: nextPosition.timestamp,
    })
  )

  const runtime = useLivePositionMapRuntime({
    settings: data.settings,
    position: gps.position,
    safeSurveyAreas: data.safeSurveyAreas,
    safeSelectedTrackpoints: data.safeSelectedTrackpoints,
    savedFeatureCollection: data.savedFeatureCollection,
    surveyAreaFeatureCollection: data.surveyAreaFeatureCollection,
    draftFeatureCollection: data.draftFeatureCollection,
    walkFeatureCollection: data.walkFeatureCollection,
    editFeatureCollection: data.editFeatureCollection,
    selectedWalkPointFeatureCollection: data.selectedWalkPointFeatureCollection,
    selectedFeatureCollection: data.selectedFeatureCollection,
    selectedTrackFeatureCollection: data.selectedTrackFeatureCollection,
    showSelectedTrack: selection.showSelectedTrack,
    selectedEnclosureId: selection.selectedEnclosureId,
    isDrawing: draw.isDrawing,
    draftPointsLength: draw.draftPoints.length,
    editingEnclosureId: edit.editingEnclosureId,
    isAddingEditPoint: edit.isAddingEditPoint,
    selectedEditPointIndex: edit.selectedEditPointIndex,
    selectedSurveyAreaId: selection.selectedSurveyAreaId,
    openEnclosureDetailsRef: refs.openEnclosureDetailsRef,
    setDraftPoints: draw.setDraftPoints,
    setSelectedWalkPointIndex: walk.setSelectedWalkPointIndex,
    setEditGeometryPoints: edit.setEditGeometryPoints,
    setSelectedEditPointIndex: edit.setSelectedEditPointIndex,
    setIsAddingEditPoint: edit.setIsAddingEditPoint,
    setEditError: edit.setEditError,
    setSelectedSurveyAreaId: selection.setSelectedSurveyAreaId,
  })

  return {
    data,
    runtime,
    effectiveSettings,
    settingsRef,
    buildPositionRef,
  }
}

export type LivePositionMapScreenData = ReturnType<typeof useLivePositionMapScreenData>
