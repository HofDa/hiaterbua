import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { LivePositionMapCanvasPanelProps } from '@/components/maps/live-position-map-canvas-panel'
import type { LivePositionSidebarPanelProps } from '@/components/maps/live-position-sidebar-panel'
import type { LivePositionStatusCardProps } from '@/components/maps/live-position-status-card'
import type { LivePositionWorkflowPanelsProps } from '@/components/maps/live-position-workflow-panels'
import type { PositionData } from '@/components/maps/live-position-map-types'
import type { LivePositionMapState } from '@/components/maps/hooks/use-live-position-map-state'
import type {
  FilteredEnclosureItem,
  WalkTrackSummary,
} from '@/lib/maps/live-position-map-helpers'
import type { SurveyArea } from '@/types/domain'
import type {
  Animal,
  Enclosure,
  EnclosureAssignment,
  Herd,
  MapBaseLayer,
} from '@/types/domain'

export type LivePositionMapPanelData = {
  safeSurveyAreas: SurveyArea[]
  selectedSurveyArea: SurveyArea | null
  filteredEnclosures: FilteredEnclosureItem[]
  selectedEnclosure: Enclosure | null
  selectedTrackSummary: WalkTrackSummary
  safeHerds: Herd[]
  herdsById: Map<string, Herd>
  animalsByHerdId: Map<string, Animal[]>
  assignmentHistoryByEnclosureId: Map<string, EnclosureAssignment[]>
  selectedWalkPoint: PositionData | null
  draftAreaM2: number
  walkAreaM2: number
  editAreaM2: number
}

export type LivePositionMapPanelRuntime = {
  containerRef: RefObject<HTMLDivElement | null>
  baseLayer: MapBaseLayer
  isBaseLayerMenuOpen: boolean
  showSurveyAreas: boolean
  prefetchStatus: string
  prefetchingMapArea: boolean
  setIsBaseLayerMenuOpen: Dispatch<SetStateAction<boolean>>
  setShowSurveyAreas: Dispatch<SetStateAction<boolean>>
  updateBaseLayer: (nextBaseLayer: MapBaseLayer) => void | Promise<void>
  prefetchVisibleMapArea: () => void | Promise<void>
  centerMapOnPosition: () => void
  focusSurveyArea: (surveyArea: SurveyArea) => void
}

export type LivePositionMapPanelActions = {
  startDrawing: () => void
  finishDrawing: () => void
  clearDraft: () => void
  undoLastPoint: () => void
  startWalkMode: () => Promise<void>
  stopWalkMode: () => void
  discardWalkMode: () => Promise<void>
  undoLastWalkPoint: () => Promise<void>
  removeWalkPointAtIndex: (pointIndex: number) => Promise<void>
  clearSelectedEnclosure: () => void
  toggleSelectedTrackForEnclosure: (enclosureId: string) => void
  startEditEnclosure: (enclosure: Enclosure) => void
  cancelEditEnclosure: () => void
  startAddEditPoint: () => void
  openAssignmentEditor: (enclosure: Enclosure) => void
  cancelAssignmentEditor: () => void
  handleAssignmentHerdIdChange: (nextHerdId: string) => void
  assignHerdToEnclosure: (enclosure: Enclosure) => Promise<void>
  endEnclosureAssignment: (assignment: EnclosureAssignment) => Promise<void>
  removeSelectedEditPoint: () => void
  persistEditedEnclosure: () => Promise<boolean>
  saveEditedEnclosure: LivePositionSidebarPanelProps['onSaveEditedEnclosure']
  deleteEnclosure: (enclosure: Enclosure) => Promise<void>
  saveWalkEnclosure: LivePositionWorkflowPanelsProps['onSaveWalkEnclosure']
  saveEnclosure: LivePositionWorkflowPanelsProps['onSaveEnclosure']
}

export type LivePositionMapPanelPresentation = {
  gpsLabel: string
  gpsDetail: string
  gpsFilterDetail: string
  focusEnclosure: (enclosure: Enclosure) => void
  handleMobileSelectedEnclosureChange: (nextId: string) => void
}

export type UseLivePositionMapPanelPropsOptions = {
  state: LivePositionMapState
  data: LivePositionMapPanelData
  runtime: LivePositionMapPanelRuntime
  actions: LivePositionMapPanelActions
  presentation: LivePositionMapPanelPresentation
}

export function buildStatusCardProps({
  state,
  presentation,
}: Pick<UseLivePositionMapPanelPropsOptions, 'state' | 'presentation'>): LivePositionStatusCardProps {
  const { gps } = state

  return {
    isLiveStatusOpen: gps.isLiveStatusOpen,
    gpsState: gps.gpsState,
    gpsLabel: presentation.gpsLabel,
    gpsDetail: presentation.gpsDetail,
    gpsFilterDetail: presentation.gpsFilterDetail,
    position: gps.position,
    onToggle: () => gps.setIsLiveStatusOpen((current) => !current),
  }
}

export function buildCanvasPanelProps({
  state,
  data,
  runtime,
  actions,
}: Pick<UseLivePositionMapPanelPropsOptions, 'state' | 'data' | 'runtime' | 'actions'>): LivePositionMapCanvasPanelProps {
  const { gps, draw, walk, selection, edit } = state

  return {
    containerRef: runtime.containerRef,
    mobilePanel: selection.mobilePanel,
    editingEnclosureId: edit.editingEnclosureId,
    position: gps.position,
    isBaseLayerMenuOpen: runtime.isBaseLayerMenuOpen,
    baseLayer: runtime.baseLayer,
    showSurveyAreas: runtime.showSurveyAreas,
    prefetchingMapArea: runtime.prefetchingMapArea,
    prefetchStatus: runtime.prefetchStatus,
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
    onCenterMap: runtime.centerMapOnPosition,
    onToggleBaseLayerMenu: () => runtime.setIsBaseLayerMenuOpen((current) => !current),
    onUpdateBaseLayer: runtime.updateBaseLayer,
    onToggleShowSurveyAreas: () => runtime.setShowSurveyAreas((current) => !current),
    onPrefetchVisibleMapArea: runtime.prefetchVisibleMapArea,
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
  }
}

export function buildWorkflowPanelsProps({
  state,
  data,
  actions,
  presentation,
}: Pick<UseLivePositionMapPanelPropsOptions, 'state' | 'data' | 'actions' | 'presentation'>): LivePositionWorkflowPanelsProps {
  const { draw, walk, selection } = state

  return {
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
    selectedEnclosure: data.selectedEnclosure,
    selectedEnclosureId: selection.selectedEnclosureId,
    isSelectedEnclosureInfoOpen: selection.isSelectedEnclosureInfoOpen,
    showSelectedTrack: selection.showSelectedTrack,
    onMobilePanelChange: selection.setMobilePanel,
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
    onRemoveWalkPointAtIndex: (pointIndex: number) => {
      void actions.removeWalkPointAtIndex(pointIndex)
    },
    onDiscardWalkMode: () => {
      void actions.discardWalkMode()
    },
    onWalkNameChange: walk.setWalkName,
    onWalkNotesChange: walk.setWalkNotes,
    onSaveWalkEnclosure: actions.saveWalkEnclosure,
    onSelectedEnclosureChange: presentation.handleMobileSelectedEnclosureChange,
    onClearSelectedEnclosure: actions.clearSelectedEnclosure,
    onToggleSelectedEnclosureInfo: () =>
      selection.setIsSelectedEnclosureInfoOpen((current) => !current),
    onToggleShowSelectedTrack: () => {
      if (data.selectedEnclosure) {
        actions.toggleSelectedTrackForEnclosure(data.selectedEnclosure.id)
      }
    },
  }
}

export function buildSidebarPanelProps({
  state,
  data,
  runtime,
  actions,
  presentation,
}: UseLivePositionMapPanelPropsOptions): LivePositionSidebarPanelProps {
  const { selection, edit, assignment } = state

  return {
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
    onFocusSurveyArea: runtime.focusSurveyArea,
    onEnclosureListFilterChange: selection.setEnclosureListFilter,
    onExpandedSavedEnclosureChange: (enclosureId: string) =>
      selection.setExpandedSavedEnclosureId((current) =>
        current === enclosureId ? null : enclosureId
      ),
    onFocusEnclosure: presentation.focusEnclosure,
    onStartEditEnclosure: actions.startEditEnclosure,
    onToggleShowSelectedTrack: actions.toggleSelectedTrackForEnclosure,
    onDeleteEnclosure: (enclosure: Enclosure) => {
      void actions.deleteEnclosure(enclosure)
    },
    onOpenAssignmentEditor: actions.openAssignmentEditor,
    onCancelAssignmentEditor: actions.cancelAssignmentEditor,
    onAssignHerdToEnclosure: (enclosure: Enclosure) => {
      void actions.assignHerdToEnclosure(enclosure)
    },
    onAssignmentHerdIdChange: actions.handleAssignmentHerdIdChange,
    onAssignmentCountChange: assignment.setAssignmentCount,
    onAssignmentNotesChange: assignment.setAssignmentNotes,
    onEndEnclosureAssignment: (assignmentRecord: EnclosureAssignment) => {
      void actions.endEnclosureAssignment(assignmentRecord)
    },
    onEditNameChange: edit.setEditName,
    onEditNotesChange: edit.setEditNotes,
    onStartAddEditPoint: actions.startAddEditPoint,
    onRemoveSelectedEditPoint: actions.removeSelectedEditPoint,
    onSaveEditedEnclosure: actions.saveEditedEnclosure,
    onCancelEditEnclosure: actions.cancelEditEnclosure,
  }
}
