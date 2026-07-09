import { useStableHandles } from '@/components/maps/hooks/use-stable-handles'
import {
  usePublishedHandles,
  usePublishedSlice,
} from '@/components/maps/hooks/use-published-slice'
import {
  useLivePositionMapStore,
  type LivePositionCanvasHandles,
  type LivePositionCanvasSlice,
  type LivePositionSidebarHandles,
  type LivePositionSidebarSlice,
  type LivePositionStatusSlice,
  type LivePositionWorkflowHandles,
  type LivePositionWorkflowSlice,
} from '@/components/maps/hooks/use-live-position-map-store'
import type { LivePositionMapState } from '@/components/maps/hooks/use-live-position-map-state'
import type { useLivePositionMapController } from '@/components/maps/hooks/use-live-position-map-controller'
import type { useLivePositionMapData } from '@/components/maps/hooks/use-live-position-map-data'
import type { useLivePositionMapPresentation } from '@/components/maps/hooks/use-live-position-map-presentation'
import type { useMapKernel } from '@/components/maps/hooks/use-map-kernel'
import type { PositionData } from '@/components/maps/live-position-map-types'
import type { Enclosure } from '@/types/domain'

type LivePositionMapRuntime = ReturnType<typeof useMapKernel> & {
  focusEnclosure: (enclosure: Enclosure) => void
  focusWalkPoints: (points: PositionData[]) => void
}

type UseLivePositionMapPublishOptions = {
  state: LivePositionMapState
  data: ReturnType<typeof useLivePositionMapData>
  runtime: LivePositionMapRuntime
  actions: ReturnType<typeof useLivePositionMapController>
  presentation: ReturnType<typeof useLivePositionMapPresentation>
}

/**
 * Maps the assembled screen state into the live-position store, one slice per panel. This is
 * the store-writing counterpart of the deleted prop-builder: the screen hook orchestrates;
 * this hook publishes. Each panel then reads its slice via selectors.
 */
export function useLivePositionMapPublish({
  state,
  data,
  runtime,
  actions,
  presentation,
}: UseLivePositionMapPublishOptions) {
  const { gps, draw, walk, selection, edit, assignment } = state

  const statusValues: LivePositionStatusSlice = {
    gpsState: gps.gpsState,
    gpsLabel: presentation.gpsLabel,
    gpsDetail: presentation.gpsDetail,
    gpsFilterDetail: presentation.gpsFilterDetail,
    position: gps.position,
  }
  usePublishedSlice(
    useLivePositionMapStore((store) => store.setStatus),
    statusValues,
  )

  const canvasValues: LivePositionCanvasSlice = {
    mobilePanel: selection.mobilePanel,
    editingEnclosureId: edit.editingEnclosureId,
    position: gps.position,
    isBaseLayerMenuOpen: runtime.isBaseLayerMenuOpen,
    baseLayer: runtime.baseLayer,
    showSurveyAreas: runtime.showSurveyAreas,
    prefetchingMapArea: runtime.prefetchingMapArea,
    prefetchStatus: runtime.prefetchStatus,
    mapReady: runtime.mapReady,
    mapLoadState: runtime.mapLoadState,
    mapWarning: runtime.mapWarning,
    isDrawing: draw.isDrawing,
    isWalking: walk.isWalking,
    draftPointsLength: draw.draftPoints.length,
    draftAreaM2: data.draftAreaM2,
    name: draw.name,
    notes: draw.notes,
    saveError: draw.saveError,
    isSaving: draw.isSaving,
    walkPoints: walk.walkPoints,
    walkPointsLength: walk.walkPoints.length,
    walkAreaM2: data.walkAreaM2,
    walkName: walk.walkName,
    walkNotes: walk.walkNotes,
    walkError: walk.walkError,
    isWalkSaving: walk.isWalkSaving,
    isWalkPointsOpen: walk.isWalkPointsOpen,
    selectedWalkPointIndex: walk.selectedWalkPointIndex,
    selectedWalkPoint: data.selectedWalkPoint,
    editGeometryPointsLength: edit.editGeometryPoints.length,
    selectedEditPointIndex: edit.selectedEditPointIndex,
    isAddingEditPoint: edit.isAddingEditPoint,
    isEditing: edit.isEditing,
  }
  const canvasHandles = useStableHandles<LivePositionCanvasHandles>({
    onCenterMap: runtime.centerMapOnPosition,
    onToggleBaseLayerMenu: () => runtime.setIsBaseLayerMenuOpen((current) => !current),
    onUpdateBaseLayer: runtime.updateBaseLayer,
    onToggleShowSurveyAreas: () => runtime.setShowSurveyAreas((current) => !current),
    onPrefetchVisibleMapArea: runtime.prefetchVisibleMapArea,
    onCancelPrefetchVisibleMapArea: runtime.cancelPrefetchVisibleMapArea,
    onStartDrawing: actions.startDrawing,
    onFinishDrawing: actions.finishDrawing,
    onUndoLastPoint: actions.undoLastPoint,
    onClearDraft: actions.clearDraft,
    onNameChange: draw.setName,
    onNotesChange: draw.setNotes,
    onSaveEnclosure: actions.saveEnclosure,
    onMobilePanelChange: selection.setMobilePanel,
    onToggleWalkPoints: () => walk.setIsWalkPointsOpen((current) => !current),
    onSelectedWalkPointIndexChange: walk.setSelectedWalkPointIndex,
    onStartWalkMode: actions.startWalkMode,
    onStopWalkMode: actions.stopWalkMode,
    onUndoLastWalkPoint: actions.undoLastWalkPoint,
    onRemoveWalkPointAtIndex: actions.removeWalkPointAtIndex,
    onDiscardWalkMode: actions.discardWalkMode,
    onWalkNameChange: walk.setWalkName,
    onWalkNotesChange: walk.setWalkNotes,
    onSaveWalkEnclosure: actions.saveWalkEnclosure,
    onStartAddEditPoint: actions.startAddEditPoint,
    onRemoveSelectedEditPoint: actions.removeSelectedEditPoint,
    onPersistEditedEnclosure: async () => {
      await actions.persistEditedEnclosure()
    },
    onCancelEditEnclosure: actions.cancelEditEnclosure,
  })
  usePublishedSlice(
    useLivePositionMapStore((store) => store.setCanvas),
    canvasValues,
  )
  usePublishedHandles(
    useLivePositionMapStore((store) => store.setCanvasHandles),
    canvasHandles,
  )

  // `onMobilePanelChange` is intentionally not published here — it stays a parent-wired prop
  // because it also opens the mobile map when switching to the draw tab.
  const workflowValues: LivePositionWorkflowSlice = {
    mobilePanel: selection.mobilePanel,
    isDrawing: draw.isDrawing,
    draftPointsCount: draw.draftPoints.length,
    draftAreaM2: data.draftAreaM2,
    name: draw.name,
    notes: draw.notes,
    saveError: draw.saveError,
    isSaving: draw.isSaving,
    isWalking: walk.isWalking,
    walkPoints: walk.walkPoints,
    walkAreaM2: data.walkAreaM2,
    walkName: walk.walkName,
    walkNotes: walk.walkNotes,
    walkError: walk.walkError,
    isWalkSaving: walk.isWalkSaving,
    isWalkPointsOpen: walk.isWalkPointsOpen,
    selectedWalkPointIndex: walk.selectedWalkPointIndex,
    selectedWalkPoint: data.selectedWalkPoint,
    filteredEnclosures: data.filteredEnclosures,
    enclosureListFilter: selection.enclosureListFilter,
    selectedEnclosure: data.selectedEnclosure,
    selectedEnclosureId: selection.selectedEnclosureId,
    assignmentEditorEnclosureId: assignment.assignmentEditorEnclosureId,
    assignmentHerdId: assignment.assignmentHerdId,
    assignmentCount: assignment.assignmentCount,
    assignmentNotes: assignment.assignmentNotes,
    assignmentError: assignment.assignmentError,
    isAssignmentSaving: assignment.isAssignmentSaving,
    endingAssignmentId: assignment.endingAssignmentId,
    safeHerds: data.safeHerds,
    herdsById: data.herdsById,
    animalsByHerdId: data.animalsByHerdId,
    activeAssignmentsByHerdId: data.activeAssignmentsByHerdId,
    isSelectedEnclosureInfoOpen: selection.isSelectedEnclosureInfoOpen,
    showSelectedTrack: selection.showSelectedTrack,
  }
  const workflowHandles = useStableHandles<LivePositionWorkflowHandles>({
    onEnclosureListFilterChange: selection.setEnclosureListFilter,
    onDeleteEnclosure: (enclosure) => {
      void actions.deleteEnclosure(enclosure)
    },
    onStartDrawing: actions.startDrawing,
    onFinishDrawing: actions.finishDrawing,
    onUndoLastPoint: actions.undoLastPoint,
    onClearDraft: actions.clearDraft,
    onNameChange: draw.setName,
    onNotesChange: draw.setNotes,
    onSaveEnclosure: actions.saveEnclosure,
    onToggleWalkPoints: () => walk.setIsWalkPointsOpen((current) => !current),
    onSelectedWalkPointIndexChange: walk.setSelectedWalkPointIndex,
    onStartWalkMode: () => {
      void actions.startWalkMode()
    },
    onStopWalkMode: actions.stopWalkMode,
    onUndoLastWalkPoint: () => {
      void actions.undoLastWalkPoint()
    },
    onRemoveWalkPointAtIndex: (pointIndex) => {
      void actions.removeWalkPointAtIndex(pointIndex)
    },
    onDiscardWalkMode: () => {
      void actions.discardWalkMode()
    },
    onWalkNameChange: walk.setWalkName,
    onWalkNotesChange: walk.setWalkNotes,
    onSaveWalkEnclosure: actions.saveWalkEnclosure,
    onSelectedEnclosureChange: presentation.handleMobileSelectedEnclosureChange,
    onToggleSelectedEnclosureInfo: () =>
      selection.setIsSelectedEnclosureInfoOpen((current) => !current),
    onToggleShowSelectedTrack: () => {
      if (data.selectedEnclosure) {
        actions.toggleSelectedTrackForEnclosure(data.selectedEnclosure.id)
      }
    },
    onOpenAssignmentEditor: actions.openAssignmentEditor,
    onCancelAssignmentEditor: actions.cancelAssignmentEditor,
    onAssignHerdToEnclosure: (enclosure) => {
      void actions.assignHerdToEnclosure(enclosure)
    },
    onAssignmentHerdIdChange: actions.handleAssignmentHerdIdChange,
    onAssignmentCountChange: assignment.setAssignmentCount,
    onAssignmentNotesChange: assignment.setAssignmentNotes,
    onEndEnclosureAssignment: (assignmentRecord) => {
      void actions.endEnclosureAssignment(assignmentRecord)
    },
  })
  usePublishedSlice(
    useLivePositionMapStore((store) => store.setWorkflow),
    workflowValues,
  )
  usePublishedHandles(
    useLivePositionMapStore((store) => store.setWorkflowHandles),
    workflowHandles,
  )

  // `onFocusEnclosure` / `onStartEditEnclosure` stay parent-wired props (they also open the
  // mobile map), so they are not published here.
  const sidebarValues: LivePositionSidebarSlice = {
    mobilePanel: selection.mobilePanel,
    safeSurveyAreas: data.safeSurveyAreas,
    selectedSurveyArea: data.selectedSurveyArea,
    selectedSurveyAreaId: selection.selectedSurveyAreaId,
    filteredEnclosures: data.filteredEnclosures,
    enclosureListFilter: selection.enclosureListFilter,
    selectedEnclosure: data.selectedEnclosure,
    selectedEnclosureId: selection.selectedEnclosureId,
    expandedSavedEnclosureId: selection.expandedSavedEnclosureId,
    assignmentEditorEnclosureId: assignment.assignmentEditorEnclosureId,
    assignmentHerdId: assignment.assignmentHerdId,
    assignmentCount: assignment.assignmentCount,
    assignmentNotes: assignment.assignmentNotes,
    assignmentError: assignment.assignmentError,
    isAssignmentSaving: assignment.isAssignmentSaving,
    endingAssignmentId: assignment.endingAssignmentId,
    showSelectedTrack: selection.showSelectedTrack,
    selectedTrackSummary: data.selectedTrackSummary,
    safeHerds: data.safeHerds,
    herdsById: data.herdsById,
    animalsByHerdId: data.animalsByHerdId,
    activeAssignmentsByHerdId: data.activeAssignmentsByHerdId,
    assignmentHistoryByEnclosureId: data.assignmentHistoryByEnclosureId,
    editingEnclosureId: edit.editingEnclosureId,
    editName: edit.editName,
    editNotes: edit.editNotes,
    editError: edit.editError,
    isEditing: edit.isEditing,
    editGeometryPointsLength: edit.editGeometryPoints.length,
    editAreaM2: data.editAreaM2,
    selectedEditPointIndex: edit.selectedEditPointIndex,
    isAddingEditPoint: edit.isAddingEditPoint,
  }
  const sidebarHandles = useStableHandles<LivePositionSidebarHandles>({
    onFocusSurveyArea: runtime.focusSurveyArea,
    onEnclosureListFilterChange: selection.setEnclosureListFilter,
    onExpandedSavedEnclosureChange: (enclosureId) =>
      selection.setExpandedSavedEnclosureId((current) =>
        current === enclosureId ? null : enclosureId,
      ),
    onToggleShowSelectedTrack: actions.toggleSelectedTrackForEnclosure,
    onDeleteEnclosure: (enclosure) => {
      void actions.deleteEnclosure(enclosure)
    },
    onOpenAssignmentEditor: actions.openAssignmentEditor,
    onCancelAssignmentEditor: actions.cancelAssignmentEditor,
    onAssignHerdToEnclosure: (enclosure) => {
      void actions.assignHerdToEnclosure(enclosure)
    },
    onAssignmentHerdIdChange: actions.handleAssignmentHerdIdChange,
    onAssignmentCountChange: assignment.setAssignmentCount,
    onAssignmentNotesChange: assignment.setAssignmentNotes,
    onEndEnclosureAssignment: (assignmentRecord) => {
      void actions.endEnclosureAssignment(assignmentRecord)
    },
    onEditNameChange: edit.setEditName,
    onEditNotesChange: edit.setEditNotes,
    onStartAddEditPoint: actions.startAddEditPoint,
    onRemoveSelectedEditPoint: actions.removeSelectedEditPoint,
    onSaveEditedEnclosure: actions.saveEditedEnclosure,
    onCancelEditEnclosure: actions.cancelEditEnclosure,
  })
  usePublishedSlice(
    useLivePositionMapStore((store) => store.setSidebar),
    sidebarValues,
  )
  usePublishedHandles(
    useLivePositionMapStore((store) => store.setSidebarHandles),
    sidebarHandles,
  )
}
