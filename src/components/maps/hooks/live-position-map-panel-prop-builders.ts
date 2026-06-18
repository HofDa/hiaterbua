import type { Dispatch, FormEvent, Ref, SetStateAction } from 'react'
import type { LivePositionSidebarPanelProps } from '@/components/maps/live-position-sidebar-panel'
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
  activeAssignmentsByHerdId: Map<string, EnclosureAssignment>
  assignmentHistoryByEnclosureId: Map<string, EnclosureAssignment[]>
  selectedWalkPoint: PositionData | null
  draftAreaM2: number
  walkAreaM2: number
  editAreaM2: number
}

export type LivePositionMapPanelRuntime = {
  containerRef: Ref<HTMLDivElement>
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
  resizeMap: () => void
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
  saveWalkEnclosure: (event: FormEvent<HTMLFormElement>) => void
  saveEnclosure: (event: FormEvent<HTMLFormElement>) => void
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
