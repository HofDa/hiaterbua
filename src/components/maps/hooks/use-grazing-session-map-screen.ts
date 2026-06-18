import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { useGeolocationWatcher } from '@/components/maps/hooks/use-geolocation-watcher'
import { useGrazingSessionMapController } from '@/components/maps/hooks/use-grazing-session-map-controller'
import { useGrazingSessionMapData } from '@/components/maps/hooks/use-grazing-session-map-data'
import { useGrazingSessionMapPresentation } from '@/components/maps/hooks/use-grazing-session-map-presentation'
import { useGrazingSessionMapState } from '@/components/maps/hooks/use-grazing-session-map-state'
import {
  useGrazingSessionMapStore,
  type GrazingCanvasHandles,
  type GrazingCanvasSlice,
  type GrazingHistoryHandles,
  type GrazingHistorySlice,
  type GrazingManagementHandles,
  type GrazingManagementSlice,
  type GrazingStatusSlice,
} from '@/components/maps/hooks/use-grazing-session-map-store'
import { useLatestValueRef } from '@/components/maps/hooks/use-latest-value-ref'
import { useStableHandles } from '@/components/maps/hooks/use-stable-handles'
import {
  getPositionLngLat,
  useMapKernel,
} from '@/components/maps/hooks/use-map-kernel'
import { useWakeLock } from '@/hooks/use-wake-lock'
import type { PositionData } from '@/components/maps/grazing-session-map-types'
import { getBoundsFromTrackpoints, getFreshPosition } from '@/lib/maps/map-core'
import { registerGrazingSessionMapSetup } from '@/lib/maps/grazing-session-map-setup'
import { defaultAppSettings } from '@/lib/settings/defaults'
import { nowIso } from '@/lib/utils/time'

export function useGrazingSessionMapScreen() {
  const state = useGrazingSessionMapState()
  const { refs, gps, selection, session, edit, history } = state
  const [showSessionEventsOnMap, setShowSessionEventsOnMap] = useState(true)

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
  const editingSessionIdRef = useLatestValueRef(edit.editingSessionId)
  const selectedEditTrackpointIndexRef = useLatestValueRef(
    edit.selectedEditTrackpointIndex
  )
  const isAddingEditTrackpointRef = useLatestValueRef(edit.isAddingEditTrackpoint)
  const positionAccuracyRef = useLatestValueRef(
    getFreshPosition(gps.position)?.accuracy ?? null
  )
  const {
    setEditTrackpoints,
    setSelectedEditTrackpointIndex,
    setIsAddingEditTrackpoint,
  } = edit
  const { setActionError } = session

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
        onSelectedTrackpointClick: setSelectedEditTrackpointIndex,
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
  const mapSources = useMemo(
    () => [
      {
        sourceId: 'current-session-track',
        featureCollection: data.currentTrackFeatureCollection,
      },
      {
        sourceId: 'survey-areas',
        featureCollection: data.surveyAreaFeatureCollection,
      },
      {
        sourceId: 'session-events',
        featureCollection: data.sessionEventFeatureCollection,
      },
      {
        sourceId: 'selected-session-track',
        featureCollection:
          edit.editingSessionId && edit.editingSessionId === selection.selectedSessionId
            ? data.editTrackFeatureCollection
            : data.selectedTrackFeatureCollection,
      },
    ],
    [
      data.currentTrackFeatureCollection,
      data.editTrackFeatureCollection,
      data.selectedTrackFeatureCollection,
      data.sessionEventFeatureCollection,
      data.surveyAreaFeatureCollection,
      edit.editingSessionId,
      selection.selectedSessionId,
    ]
  )
  const layerVisibility = useMemo(
    () => [
      {
        layerId: 'session-events-points',
        visible: showSessionEventsOnMap,
      },
    ],
    [showSessionEventsOnMap]
  )
  const runtime = useMapKernel({
    settings: data.settings,
    position: gps.position,
    baseLayerSettingsMode: 'always',
    selectedSurveyAreaId: selection.selectedSurveyAreaId,
    safeSurveyAreas: data.safeSurveyAreas,
    setSelectedSurveyAreaId: selection.setSelectedSurveyAreaId,
    onSettingsSaveError: setActionError,
    registerLayers,
    sources: mapSources,
    layerVisibility,
  })
  const { mapRef, mapReady } = runtime

  useEffect(() => {
    if (!mapReady || !gps.position || !mapRef.current) return

    if (
      data.safeCurrentTrackpoints.length === 0 &&
      data.safeSelectedTrackpoints.length === 0
    ) {
      mapRef.current.easeTo({
        center: getPositionLngLat(gps.position),
        zoom: Math.max(mapRef.current.getZoom(), 15),
        duration: 700,
      })
    }
  }, [
    data.safeCurrentTrackpoints.length,
    data.safeSelectedTrackpoints.length,
    gps.position,
    mapReady,
    mapRef,
  ])

  useEffect(() => {
    if (!mapRef.current || data.safeCurrentTrackpoints.length < 2) return

    const bounds = getBoundsFromTrackpoints(data.safeCurrentTrackpoints)
    if (!bounds) return

    mapRef.current.fitBounds(bounds, {
      padding: 50,
      duration: 700,
      maxZoom: 17,
    })
  }, [data.safeCurrentTrackpoints, mapRef])

  useEffect(() => {
    if (
      !mapRef.current ||
      !selection.selectedSessionId ||
      data.safeSelectedTrackpoints.length === 0
    ) {
      return
    }

    const bounds = getBoundsFromTrackpoints(data.safeSelectedTrackpoints)
    if (!bounds) return

    mapRef.current.fitBounds(bounds, {
      padding: 50,
      duration: 700,
      maxZoom: 17,
    })
  }, [data.safeSelectedTrackpoints, mapRef, selection.selectedSessionId])

  const controller = useGrazingSessionMapController({
    activeSession: data.activeSession ?? null,
    selectedSession: data.selectedSession,
    groupedSessionHistory: data.groupedSessionHistory,
    safeCurrentTrackpoints: data.safeCurrentTrackpoints,
    safeSelectedTrackpoints: data.safeSelectedTrackpoints,
    safeHerds: data.safeHerds,
    animalsByHerdId: data.animalsByHerdId,
    acceptedPositionRef: refs.acceptedPositionRef,
    selection,
    session,
    edit,
    history,
  })

  useGeolocationWatcher({
    acceptedPositionRef: refs.acceptedPositionRef,
    buildPositionRef,
    onAcceptedPositionRef: controller.handleAcceptedPositionRef,
    settingsRef,
    watchIdRef: refs.watchIdRef,
    setGpsState: gps.setGpsState,
    setLastPositionDecision: gps.setLastPositionDecision,
    setPosition: gps.setPosition,
  })

  const presentation = useGrazingSessionMapPresentation({
    gpsState: gps.gpsState,
    position: gps.position,
    lastPositionDecision: gps.lastPositionDecision,
    effectiveSettings,
    safeHerds: data.safeHerds,
    selectedHerdId: session.selectedHerdId,
    currentSessionStatus: session.currentSessionStatus,
  })

  useWakeLock(session.currentSessionStatus === 'active')

  // Publish the status + canvas slices to the store; the panels read them via selectors
  // instead of receiving prop bags rebuilt on every screen render.
  const statusValues: GrazingStatusSlice = {
    gpsState: gps.gpsState,
    gpsLabel: presentation.gpsLabel,
    gpsDetail: presentation.gpsDetail,
    gpsFilterDetail: presentation.gpsFilterDetail,
    herdLabel: presentation.herdLabel,
    statusLabel: presentation.statusLabel,
    coordinatesLabel: presentation.coordinatesLabel,
    updateLabel: presentation.updateLabel,
  }

  const canvasValues: GrazingCanvasSlice = {
    editingSessionId: edit.editingSessionId,
    safeCurrentTrackpointsLength: data.safeCurrentTrackpoints.length,
    currentDistanceM: data.currentMetrics?.distanceM ?? 0,
    currentDurationS: data.currentMetrics?.durationS ?? 0,
    safeHerds: data.safeHerds,
    selectedHerdId: session.selectedHerdId,
    selectedAnimalCount: session.sessionAnimalCount,
    sessionNotes: session.sessionNotes,
    currentSessionStatus: session.currentSessionStatus,
    isSaving: session.isSaving,
    isEventSaving: session.isEventSaving,
    hasHerds: data.safeHerds.length > 0,
    eventNote: session.eventNote,
    eventStatus: session.eventStatus,
    actionError: session.actionError,
    currentMetrics: data.currentMetrics,
    safeCurrentSessionEvents: data.safeCurrentSessionEvents,
    position: gps.position,
    isBaseLayerMenuOpen: runtime.isBaseLayerMenuOpen,
    baseLayer: runtime.baseLayer,
    showSurveyAreas: runtime.showSurveyAreas,
    showSessionEventsOnMap,
    prefetchingMapArea: runtime.prefetchingMapArea,
    prefetchStatus: runtime.prefetchStatus,
    isAddingEditTrackpoint: edit.isAddingEditTrackpoint,
    selectedEditTrackpointIndex: edit.selectedEditTrackpointIndex,
    editTrackpointsLength: edit.editTrackpoints.length,
  }

  const canvasHandles = useStableHandles<GrazingCanvasHandles>({
    onSelectedHerdIdChange: controller.changeSelectedHerdId,
    onAdjustAnimalCount: controller.adjustSessionAnimalCount,
    onSessionNotesChange: session.setSessionNotes,
    onStartOrResumeSession:
      session.currentSessionStatus === 'paused'
        ? controller.resumeSession
        : controller.startSession,
    onPauseSession: controller.pauseSession,
    onResumeSession: controller.resumeSession,
    onStopSession: controller.stopSession,
    onEventNoteChange: session.setEventNote,
    onAddSessionMarkerEvent: controller.addSessionMarkerEvent,
    onCenterMap: runtime.centerMapOnPosition,
    onToggleBaseLayerMenu: () => runtime.setIsBaseLayerMenuOpen((current) => !current),
    onUpdateBaseLayer: runtime.updateBaseLayer,
    onToggleShowSurveyAreas: () => runtime.setShowSurveyAreas((current) => !current),
    onToggleShowSessionEventsOnMap: () => setShowSessionEventsOnMap((current) => !current),
    onPrefetchVisibleMapArea: runtime.prefetchVisibleMapArea,
    onStartAddEditTrackpoint: controller.startAddEditTrackpoint,
    onRemoveSelectedEditTrackpoint: controller.removeSelectedEditTrackpoint,
    onSaveEditedSession: controller.saveEditedSession,
    onCancelEditSession: controller.cancelEditSession,
  })

  const setStatus = useGrazingSessionMapStore((store) => store.setStatus)
  const setCanvas = useGrazingSessionMapStore((store) => store.setCanvas)
  const setCanvasHandles = useGrazingSessionMapStore((store) => store.setCanvasHandles)
  useEffect(() => {
    setStatus(statusValues)
  })
  useEffect(() => {
    setCanvas(canvasValues)
  })
  useEffect(() => {
    setCanvasHandles(canvasHandles)
  }, [canvasHandles, setCanvasHandles])

  const managementValues: GrazingManagementSlice = {
    safeHerds: data.safeHerds,
    selectedHerdId: session.selectedHerdId,
    selectedAnimalCount: session.sessionAnimalCount,
    sessionNotes: session.sessionNotes,
    currentSessionStatus: session.currentSessionStatus,
    isSaving: session.isSaving,
    isEventSaving: session.isEventSaving,
    eventNote: session.eventNote,
    eventStatus: session.eventStatus,
    actionError: session.actionError,
    safeCurrentTrackpointsLength: data.safeCurrentTrackpoints.length,
    currentMetrics: data.currentMetrics,
    safeCurrentSessionEvents: data.safeCurrentSessionEvents,
  }

  const managementHandles = useStableHandles<GrazingManagementHandles>({
    onSelectedHerdIdChange: controller.changeSelectedHerdId,
    onAdjustAnimalCount: controller.adjustSessionAnimalCount,
    onSessionNotesChange: session.setSessionNotes,
    onStartSession: controller.startSession,
    onPauseSession: controller.pauseSession,
    onResumeSession: controller.resumeSession,
    onStopSession: controller.stopSession,
    onEventNoteChange: session.setEventNote,
    onAddSessionMarkerEvent: controller.addSessionMarkerEvent,
  })

  const historyValues: GrazingHistorySlice = {
    isHistoryExpanded: history.isHistoryExpanded,
    safeRecentSessions: data.safeRecentSessions,
    safeHerds: data.safeHerds,
    safeSurveyAreas: data.safeSurveyAreas,
    selectedSurveyArea: data.selectedSurveyArea,
    selectedSurveyAreaId: selection.selectedSurveyAreaId,
    sessionHistoryStats: data.sessionHistoryStats,
    groupedSessionHistory: data.groupedSessionHistory,
    expandedHistoryDays: history.expandedHistoryDays,
    expandedHistorySessionId: history.expandedHistorySessionId,
    selectedSessionId: selection.selectedSessionId,
    selectedSession: data.selectedSession,
    selectedMetrics: data.selectedMetrics,
    safeSelectedTrackpoints: data.safeSelectedTrackpoints,
    safeSelectedSessionEvents: data.safeSelectedSessionEvents,
    editingSessionId: edit.editingSessionId,
    editMetrics: data.editMetrics,
    editTrackpointsLength: edit.editTrackpoints.length,
    editStartTime: edit.editStartTime,
    editEndTime: edit.editEndTime,
    actionError: session.actionError,
    isSaving: session.isSaving,
  }

  const historyHandles = useStableHandles<GrazingHistoryHandles>({
    onToggleHistoryExpanded: () => history.setIsHistoryExpanded((current) => !current),
    onToggleHistoryDay: controller.toggleHistoryDay,
    onExpandedHistorySessionChange: controller.toggleExpandedHistorySession,
    onFocusSurveyArea: runtime.focusSurveyArea,
    onSelectSession: selection.setSelectedSessionId,
    onStartEditSession: controller.startEditSession,
    onEditStartTimeChange: edit.setEditStartTime,
    onEditEndTimeChange: edit.setEditEndTime,
    onSaveEditedSession: controller.saveEditedSession,
    onCancelEditSession: controller.cancelEditSession,
    onDeleteSession: controller.deleteSession,
  })

  const setManagement = useGrazingSessionMapStore((store) => store.setManagement)
  const setManagementHandles = useGrazingSessionMapStore((store) => store.setManagementHandles)
  const setHistory = useGrazingSessionMapStore((store) => store.setHistory)
  const setHistoryHandles = useGrazingSessionMapStore((store) => store.setHistoryHandles)
  useEffect(() => {
    setManagement(managementValues)
  })
  useEffect(() => {
    setManagementHandles(managementHandles)
  }, [managementHandles, setManagementHandles])
  useEffect(() => {
    setHistory(historyValues)
  })
  useEffect(() => {
    setHistoryHandles(historyHandles)
  }, [historyHandles, setHistoryHandles])

  return {
    // Wired synchronously (map mount ref) / consumed by the screen component (resize +
    // the mobile-map summary line). All four panels self-source from the store.
    containerRef: runtime.containerRef,
    resizeMap: runtime.resizeMap,
    safeCurrentTrackpointsLength: data.safeCurrentTrackpoints.length,
    currentDistanceM: data.currentMetrics?.distanceM ?? 0,
    currentDurationS: data.currentMetrics?.durationS ?? 0,
  }
}
