import type { Dispatch, SetStateAction } from 'react'
import { useStableHandles } from '@/components/maps/hooks/use-stable-handles'
import {
  usePublishedHandles,
  usePublishedSlice,
} from '@/components/maps/hooks/use-published-slice'
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
import type { useGrazingSessionMapController } from '@/components/maps/hooks/use-grazing-session-map-controller'
import type { useGrazingSessionMapData } from '@/components/maps/hooks/use-grazing-session-map-data'
import type { useGrazingSessionMapPresentation } from '@/components/maps/hooks/use-grazing-session-map-presentation'
import type { useGrazingSessionMapState } from '@/components/maps/hooks/use-grazing-session-map-state'
import type { useMapKernel } from '@/components/maps/hooks/use-map-kernel'

type UseGrazingSessionMapPublishOptions = {
  state: ReturnType<typeof useGrazingSessionMapState>
  data: ReturnType<typeof useGrazingSessionMapData>
  runtime: ReturnType<typeof useMapKernel>
  controller: ReturnType<typeof useGrazingSessionMapController>
  presentation: ReturnType<typeof useGrazingSessionMapPresentation>
  showSessionEventsOnMap: boolean
  setShowSessionEventsOnMap: Dispatch<SetStateAction<boolean>>
}

/**
 * Maps the assembled screen state into the grazing-session store, one slice per panel — the
 * store-writing counterpart of the deleted prop bags. The screen hook orchestrates; this hook
 * publishes. Each panel then reads its slice via selectors.
 */
export function useGrazingSessionMapPublish({
  state,
  data,
  runtime,
  controller,
  presentation,
  showSessionEventsOnMap,
  setShowSessionEventsOnMap,
}: UseGrazingSessionMapPublishOptions) {
  const { gps, selection, session, edit, history } = state

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
  usePublishedSlice(
    useGrazingSessionMapStore((store) => store.setStatus),
    statusValues,
  )

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
    mapReady: runtime.mapReady,
    mapLoadState: runtime.mapLoadState,
    mapWarning: runtime.mapWarning,
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
    onCancelPrefetchVisibleMapArea: runtime.cancelPrefetchVisibleMapArea,
    onStartAddEditTrackpoint: controller.startAddEditTrackpoint,
    onRemoveSelectedEditTrackpoint: controller.removeSelectedEditTrackpoint,
    onSaveEditedSession: controller.saveEditedSession,
    onCancelEditSession: controller.cancelEditSession,
  })
  usePublishedSlice(
    useGrazingSessionMapStore((store) => store.setCanvas),
    canvasValues,
  )
  usePublishedHandles(
    useGrazingSessionMapStore((store) => store.setCanvasHandles),
    canvasHandles,
  )

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
  usePublishedSlice(
    useGrazingSessionMapStore((store) => store.setManagement),
    managementValues,
  )
  usePublishedHandles(
    useGrazingSessionMapStore((store) => store.setManagementHandles),
    managementHandles,
  )

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
  usePublishedSlice(
    useGrazingSessionMapStore((store) => store.setHistory),
    historyValues,
  )
  usePublishedHandles(
    useGrazingSessionMapStore((store) => store.setHistoryHandles),
    historyHandles,
  )
}
