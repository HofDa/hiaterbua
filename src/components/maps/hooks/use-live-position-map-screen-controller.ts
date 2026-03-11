import { useGeolocationWatcher } from '@/components/maps/hooks/use-geolocation-watcher'
import { useLivePositionMapController } from '@/components/maps/hooks/use-live-position-map-controller'
import { useLivePositionMapPanelProps } from '@/components/maps/hooks/use-live-position-map-panel-props'
import { useLivePositionMapPresentation } from '@/components/maps/hooks/use-live-position-map-presentation'
import type { LivePositionMapScreenData } from '@/components/maps/hooks/use-live-position-map-screen-data'
import type { LivePositionMapState } from '@/components/maps/hooks/use-live-position-map-state'

type UseLivePositionMapScreenControllerOptions = {
  state: LivePositionMapState
  screenData: LivePositionMapScreenData
}

export function useLivePositionMapScreenController({
  state,
  screenData,
}: UseLivePositionMapScreenControllerOptions) {
  const { refs, gps, draw, walk, selection, edit, assignment } = state
  const { data, runtime, effectiveSettings, settingsRef, buildPositionRef } = screenData

  const actions = useLivePositionMapController({
    safeEnclosures: data.safeEnclosures,
    safeHerds: data.safeHerds,
    herdsById: data.herdsById,
    animalsByHerdId: data.animalsByHerdId,
    activeAssignmentsByEnclosureId: data.activeAssignmentsByEnclosureId,
    acceptedPositionRef: refs.acceptedPositionRef,
    positionAccuracy: gps.position?.accuracy ?? null,
    draftAreaM2: data.draftAreaM2,
    editAreaM2: data.editAreaM2,
    walkAreaM2: data.walkAreaM2,
    draftPoints: draw.draftPoints,
    isDrawing: draw.isDrawing,
    name: draw.name,
    notes: draw.notes,
    walkPoints: walk.walkPoints,
    isWalking: walk.isWalking,
    walkName: walk.walkName,
    walkNotes: walk.walkNotes,
    selectedWalkPointIndex: walk.selectedWalkPointIndex,
    selectedEnclosureId: selection.selectedEnclosureId,
    editingEnclosureId: edit.editingEnclosureId,
    editName: edit.editName,
    editNotes: edit.editNotes,
    editGeometryPoints: edit.editGeometryPoints,
    selectedEditPointIndex: edit.selectedEditPointIndex,
    assignmentHerdId: assignment.assignmentHerdId,
    assignmentCount: assignment.assignmentCount,
    assignmentNotes: assignment.assignmentNotes,
    setDraftPoints: draw.setDraftPoints,
    setIsDrawing: draw.setIsDrawing,
    setName: draw.setName,
    setNotes: draw.setNotes,
    setSaveError: draw.setSaveError,
    setIsSaving: draw.setIsSaving,
    setWalkPoints: walk.setWalkPoints,
    setIsWalking: walk.setIsWalking,
    setWalkName: walk.setWalkName,
    setWalkNotes: walk.setWalkNotes,
    setWalkError: walk.setWalkError,
    setIsWalkSaving: walk.setIsWalkSaving,
    setSelectedWalkPointIndex: walk.setSelectedWalkPointIndex,
    setSelectedEnclosureId: selection.setSelectedEnclosureId,
    setShowSelectedTrack: selection.setShowSelectedTrack,
    setIsSelectedEnclosureInfoOpen: selection.setIsSelectedEnclosureInfoOpen,
    setEditingEnclosureId: edit.setEditingEnclosureId,
    setEditName: edit.setEditName,
    setEditNotes: edit.setEditNotes,
    setEditError: edit.setEditError,
    setIsEditing: edit.setIsEditing,
    setEditGeometryPoints: edit.setEditGeometryPoints,
    setSelectedEditPointIndex: edit.setSelectedEditPointIndex,
    setIsAddingEditPoint: edit.setIsAddingEditPoint,
    setMobilePanel: selection.setMobilePanel,
    setAssignmentEditorEnclosureId: assignment.setAssignmentEditorEnclosureId,
    setAssignmentHerdId: assignment.setAssignmentHerdId,
    setAssignmentCount: assignment.setAssignmentCount,
    setAssignmentNotes: assignment.setAssignmentNotes,
    setAssignmentError: assignment.setAssignmentError,
    setIsAssignmentSaving: assignment.setIsAssignmentSaving,
    setEndingAssignmentId: assignment.setEndingAssignmentId,
    focusEnclosure: runtime.focusEnclosure,
    focusWalkPoints: runtime.focusWalkPoints,
  })

  useGeolocationWatcher({
    acceptedPositionRef: refs.acceptedPositionRef,
    buildPositionRef,
    onAcceptedPositionRef: actions.handleAcceptedPositionRef,
    settingsRef,
    watchIdRef: refs.watchIdRef,
    setGpsState: gps.setGpsState,
    setLastPositionDecision: gps.setLastPositionDecision,
    setPosition: gps.setPosition,
  })

  const presentation = useLivePositionMapPresentation({
    gpsState: gps.gpsState,
    position: gps.position,
    lastPositionDecision: gps.lastPositionDecision,
    effectiveSettings,
    safeEnclosures: data.safeEnclosures,
    openEnclosureDetailsRef: refs.openEnclosureDetailsRef,
    focusMapOnEnclosure: runtime.focusEnclosure,
    setSelectedEnclosureId: selection.setSelectedEnclosureId,
    setShowSelectedTrack: selection.setShowSelectedTrack,
    setIsSelectedEnclosureInfoOpen: selection.setIsSelectedEnclosureInfoOpen,
    setEditingEnclosureId: edit.setEditingEnclosureId,
  })

  return useLivePositionMapPanelProps({
    state,
    data: {
      safeSurveyAreas: data.safeSurveyAreas,
      selectedSurveyArea: data.selectedSurveyArea,
      filteredEnclosures: data.filteredEnclosures,
      selectedEnclosure: data.selectedEnclosure,
      selectedTrackSummary: data.selectedTrackSummary,
      safeHerds: data.safeHerds,
      herdsById: data.herdsById,
      animalsByHerdId: data.animalsByHerdId,
      assignmentHistoryByEnclosureId: data.assignmentHistoryByEnclosureId,
      selectedWalkPoint: data.selectedWalkPoint,
      draftAreaM2: data.draftAreaM2,
      walkAreaM2: data.walkAreaM2,
      editAreaM2: data.editAreaM2,
    },
    runtime: {
      containerRef: runtime.containerRef,
      baseLayer: runtime.baseLayer,
      isBaseLayerMenuOpen: runtime.isBaseLayerMenuOpen,
      showSurveyAreas: runtime.showSurveyAreas,
      prefetchStatus: runtime.prefetchStatus,
      prefetchingMapArea: runtime.prefetchingMapArea,
      setIsBaseLayerMenuOpen: runtime.setIsBaseLayerMenuOpen,
      setShowSurveyAreas: runtime.setShowSurveyAreas,
      updateBaseLayer: runtime.updateBaseLayer,
      prefetchVisibleMapArea: runtime.prefetchVisibleMapArea,
      centerMapOnPosition: runtime.centerMapOnPosition,
      focusSurveyArea: runtime.focusSurveyArea,
    },
    actions,
    presentation,
  })
}
