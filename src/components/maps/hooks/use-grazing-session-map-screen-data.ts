import { useLatestValueRef } from '@/components/maps/hooks/use-latest-value-ref'
import { useGrazingSessionMapData } from '@/components/maps/hooks/use-grazing-session-map-data'
import { useGrazingSessionMapRuntime } from '@/components/maps/hooks/use-grazing-session-map-runtime'
import type { PositionData } from '@/components/maps/grazing-session-map-types'
import type { GrazingSessionMapState } from '@/components/maps/hooks/use-grazing-session-map-state'
import { defaultAppSettings } from '@/lib/settings/defaults'

export function useGrazingSessionMapScreenData(state: GrazingSessionMapState) {
  const { gps, selection, session, edit } = state

  const data = useGrazingSessionMapData({
    currentSessionId: session.currentSessionId,
    selectedSessionId: selection.selectedSessionId,
    selectedSurveyAreaId: selection.selectedSurveyAreaId,
    editTrackpoints: edit.editTrackpoints,
    editStartTime: edit.editStartTime,
    editEndTime: edit.editEndTime,
    liveDurationTick: session.liveDurationTick,
  })

  const effectiveSettings = data.settings ?? defaultAppSettings
  const settingsRef = useLatestValueRef(effectiveSettings)
  const buildPositionRef = useLatestValueRef(
    (nextPosition: GeolocationPosition): PositionData => ({
      latitude: nextPosition.coords.latitude,
      longitude: nextPosition.coords.longitude,
      accuracy: nextPosition.coords.accuracy,
      speed: nextPosition.coords.speed ?? null,
      heading: nextPosition.coords.heading ?? null,
      timestamp: nextPosition.timestamp,
    })
  )

  const runtime = useGrazingSessionMapRuntime({
    settings: data.settings,
    position: gps.position,
    positionAccuracy: gps.position?.accuracy ?? null,
    safeCurrentTrackpoints: data.safeCurrentTrackpoints,
    safeSelectedTrackpoints: data.safeSelectedTrackpoints,
    safeSurveyAreas: data.safeSurveyAreas,
    currentTrackFeatureCollection: data.currentTrackFeatureCollection,
    selectedTrackFeatureCollection: data.selectedTrackFeatureCollection,
    editTrackFeatureCollection: data.editTrackFeatureCollection,
    surveyAreaFeatureCollection: data.surveyAreaFeatureCollection,
    sessionEventFeatureCollection: data.sessionEventFeatureCollection,
    selectedSessionId: selection.selectedSessionId,
    editingSessionId: edit.editingSessionId,
    selectedEditTrackpointIndex: edit.selectedEditTrackpointIndex,
    isAddingEditTrackpoint: edit.isAddingEditTrackpoint,
    selectedSurveyAreaId: selection.selectedSurveyAreaId,
    setSelectedSurveyAreaId: selection.setSelectedSurveyAreaId,
    setEditTrackpoints: edit.setEditTrackpoints,
    setSelectedEditTrackpointIndex: edit.setSelectedEditTrackpointIndex,
    setIsAddingEditTrackpoint: edit.setIsAddingEditTrackpoint,
    setActionError: session.setActionError,
  })

  return {
    data,
    runtime,
    effectiveSettings,
    settingsRef,
    buildPositionRef,
  }
}

export type GrazingSessionMapScreenData = ReturnType<typeof useGrazingSessionMapScreenData>
