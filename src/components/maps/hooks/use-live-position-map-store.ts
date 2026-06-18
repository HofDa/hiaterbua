import { create } from 'zustand'
import { shallow } from 'zustand/shallow'
import type { FormEvent } from 'react'
import type { GpsState } from '@/lib/maps/map-core'
import type {
  EnclosureListFilter,
  FilteredEnclosureItem,
  WalkTrackSummary,
} from '@/lib/maps/live-position-map-helpers'
import type {
  MobilePanel,
  PositionData,
} from '@/components/maps/live-position-map-types'
import type {
  Animal,
  Enclosure,
  EnclosureAssignment,
  Herd,
  MapBaseLayer,
  SurveyArea,
} from '@/types/domain'

/**
 * Per-screen store for the live-position map. This is the replacement for the panel-prop
 * bags: components read exactly the slice they need via selectors, so a GPS tick only
 * re-renders the components that actually display the changed data — not the whole tree.
 *
 * Migrated so far: the live-status card and the map canvas panel.
 */
export type LivePositionStatusSlice = {
  gpsState: GpsState
  gpsLabel: string
  gpsDetail: string
  gpsFilterDetail: string
  position: PositionData | null
}

/** Values the canvas panel renders. Pushed from the screen hook (shallow-guarded). */
export type LivePositionCanvasSlice = {
  mobilePanel: MobilePanel
  editingEnclosureId: string | null
  position: PositionData | null
  isBaseLayerMenuOpen: boolean
  baseLayer: MapBaseLayer
  showSurveyAreas: boolean
  prefetchingMapArea: boolean
  prefetchStatus: string
  isDrawing: boolean
  isWalking: boolean
  draftPointsLength: number
  draftAreaM2: number
  name: string
  notes: string
  saveError: string
  isSaving: boolean
  walkPoints: PositionData[]
  walkPointsLength: number
  walkAreaM2: number
  walkName: string
  walkNotes: string
  walkError: string
  isWalkSaving: boolean
  isWalkPointsOpen: boolean
  selectedWalkPointIndex: number | null
  selectedWalkPoint: PositionData | null
  editGeometryPointsLength: number
  selectedEditPointIndex: number | null
  isAddingEditPoint: boolean
  isEditing: boolean
}

/** Canvas panel callbacks. Stabilized via `useStableHandles`, so this object is set once. */
export type LivePositionCanvasHandles = {
  onCenterMap: () => void
  onToggleBaseLayerMenu: () => void
  onUpdateBaseLayer: (nextBaseLayer: MapBaseLayer) => void | Promise<void>
  onToggleShowSurveyAreas: () => void
  onPrefetchVisibleMapArea: () => void | Promise<void>
  onStartDrawing: () => void
  onFinishDrawing: () => void
  onUndoLastPoint: () => void
  onClearDraft: () => void
  onNameChange: (value: string) => void
  onNotesChange: (value: string) => void
  onSaveEnclosure: (event: FormEvent<HTMLFormElement>) => void
  onMobilePanelChange: (panel: MobilePanel) => void
  onToggleWalkPoints: () => void
  onSelectedWalkPointIndexChange: (index: number | null) => void
  onStartWalkMode: () => void | Promise<void>
  onStopWalkMode: () => void
  onUndoLastWalkPoint: () => void | Promise<void>
  onRemoveWalkPointAtIndex: (index: number) => void | Promise<void>
  onDiscardWalkMode: () => void | Promise<void>
  onWalkNameChange: (value: string) => void
  onWalkNotesChange: (value: string) => void
  onSaveWalkEnclosure: (event: FormEvent<HTMLFormElement>) => void
  onStartAddEditPoint: () => void
  onRemoveSelectedEditPoint: () => void
  onPersistEditedEnclosure: () => void | Promise<void>
  onCancelEditEnclosure: () => void
}

/** Values the mobile workflow panels render. Pushed from the screen hook (shallow-guarded). */
export type LivePositionWorkflowSlice = {
  mobilePanel: MobilePanel
  isDrawing: boolean
  draftPointsCount: number
  draftAreaM2: number
  name: string
  notes: string
  saveError: string
  isSaving: boolean
  isWalking: boolean
  walkPoints: PositionData[]
  walkAreaM2: number
  walkName: string
  walkNotes: string
  walkError: string
  isWalkSaving: boolean
  isWalkPointsOpen: boolean
  selectedWalkPointIndex: number | null
  selectedWalkPoint: PositionData | null
  filteredEnclosures: FilteredEnclosureItem[]
  selectedEnclosure: Enclosure | null
  selectedEnclosureId: string | null
  assignmentEditorEnclosureId: string | null
  assignmentHerdId: string
  assignmentCount: string
  assignmentNotes: string
  assignmentError: string
  isAssignmentSaving: boolean
  endingAssignmentId: string | null
  safeHerds: Herd[]
  herdsById: Map<string, Herd>
  animalsByHerdId: Map<string, Animal[]>
  activeAssignmentsByHerdId: Map<string, EnclosureAssignment>
  isSelectedEnclosureInfoOpen: boolean
  showSelectedTrack: boolean
}

/** Workflow panel callbacks (minus `onMobilePanelChange`, which stays a parent-wired prop). */
export type LivePositionWorkflowHandles = {
  onStartDrawing: () => void
  onFinishDrawing: () => void
  onUndoLastPoint: () => void
  onClearDraft: () => void
  onNameChange: (value: string) => void
  onNotesChange: (value: string) => void
  onSaveEnclosure: (event: FormEvent<HTMLFormElement>) => void
  onToggleWalkPoints: () => void
  onSelectedWalkPointIndexChange: (index: number | null) => void
  onStartWalkMode: () => void
  onStopWalkMode: () => void
  onUndoLastWalkPoint: () => void
  onRemoveWalkPointAtIndex: (index: number) => void
  onDiscardWalkMode: () => void
  onWalkNameChange: (value: string) => void
  onWalkNotesChange: (value: string) => void
  onSaveWalkEnclosure: (event: FormEvent<HTMLFormElement>) => void
  onSelectedEnclosureChange: (nextId: string) => void
  onToggleSelectedEnclosureInfo: () => void
  onToggleShowSelectedTrack: () => void
  onOpenAssignmentEditor: (enclosure: Enclosure) => void
  onCancelAssignmentEditor: () => void
  onAssignHerdToEnclosure: (enclosure: Enclosure) => void
  onAssignmentHerdIdChange: (nextHerdId: string) => void
  onAssignmentCountChange: (value: string) => void
  onAssignmentNotesChange: (value: string) => void
  onEndEnclosureAssignment: (assignment: EnclosureAssignment) => void
}

/** Values the sidebar panel renders. Pushed from the screen hook (shallow-guarded). */
export type LivePositionSidebarSlice = {
  mobilePanel: MobilePanel
  safeSurveyAreas: SurveyArea[]
  selectedSurveyArea: SurveyArea | null
  selectedSurveyAreaId: string | null
  filteredEnclosures: FilteredEnclosureItem[]
  enclosureListFilter: EnclosureListFilter
  selectedEnclosure: Enclosure | null
  selectedEnclosureId: string | null
  expandedSavedEnclosureId: string | null
  assignmentEditorEnclosureId: string | null
  assignmentHerdId: string
  assignmentCount: string
  assignmentNotes: string
  assignmentError: string
  isAssignmentSaving: boolean
  endingAssignmentId: string | null
  showSelectedTrack: boolean
  selectedTrackSummary: WalkTrackSummary
  safeHerds: Herd[]
  herdsById: Map<string, Herd>
  animalsByHerdId: Map<string, Animal[]>
  activeAssignmentsByHerdId: Map<string, EnclosureAssignment>
  assignmentHistoryByEnclosureId: Map<string, EnclosureAssignment[]>
  editingEnclosureId: string | null
  editName: string
  editNotes: string
  editError: string
  isEditing: boolean
  editGeometryPointsLength: number
  editAreaM2: number
  selectedEditPointIndex: number | null
  isAddingEditPoint: boolean
}

/** Sidebar callbacks (minus the two parent-wired focus/edit handlers that open the map). */
export type LivePositionSidebarHandles = {
  onFocusSurveyArea: (surveyArea: SurveyArea) => void
  onEnclosureListFilterChange: (filter: EnclosureListFilter) => void
  onExpandedSavedEnclosureChange: (enclosureId: string) => void
  onToggleShowSelectedTrack: (enclosureId: string) => void
  onDeleteEnclosure: (enclosure: Enclosure) => void
  onOpenAssignmentEditor: (enclosure: Enclosure) => void
  onCancelAssignmentEditor: () => void
  onAssignHerdToEnclosure: (enclosure: Enclosure) => void
  onAssignmentHerdIdChange: (nextHerdId: string) => void
  onAssignmentCountChange: (value: string) => void
  onAssignmentNotesChange: (value: string) => void
  onEndEnclosureAssignment: (assignment: EnclosureAssignment) => void
  onEditNameChange: (value: string) => void
  onEditNotesChange: (value: string) => void
  onStartAddEditPoint: () => void
  onRemoveSelectedEditPoint: () => void
  onSaveEditedEnclosure: (event: FormEvent<HTMLFormElement>) => void
  onCancelEditEnclosure: () => void
}

const initialStatusSlice: LivePositionStatusSlice = {
  gpsState: 'idle',
  gpsLabel: '',
  gpsDetail: '',
  gpsFilterDetail: '',
  position: null,
}

const noop = () => {}

// Seed handles so the canvas panel never reads `null` on its first render (before the
// screen hook's publish effect runs). Replaced once with the real, stable handles.
const initialCanvasHandles: LivePositionCanvasHandles = {
  onCenterMap: noop,
  onToggleBaseLayerMenu: noop,
  onUpdateBaseLayer: noop,
  onToggleShowSurveyAreas: noop,
  onPrefetchVisibleMapArea: noop,
  onStartDrawing: noop,
  onFinishDrawing: noop,
  onUndoLastPoint: noop,
  onClearDraft: noop,
  onNameChange: noop,
  onNotesChange: noop,
  onSaveEnclosure: noop,
  onMobilePanelChange: noop,
  onToggleWalkPoints: noop,
  onSelectedWalkPointIndexChange: noop,
  onStartWalkMode: noop,
  onStopWalkMode: noop,
  onUndoLastWalkPoint: noop,
  onRemoveWalkPointAtIndex: noop,
  onDiscardWalkMode: noop,
  onWalkNameChange: noop,
  onWalkNotesChange: noop,
  onSaveWalkEnclosure: noop,
  onStartAddEditPoint: noop,
  onRemoveSelectedEditPoint: noop,
  onPersistEditedEnclosure: noop,
  onCancelEditEnclosure: noop,
}

const initialCanvasSlice: LivePositionCanvasSlice = {
  mobilePanel: 'saved',
  editingEnclosureId: null,
  position: null,
  isBaseLayerMenuOpen: false,
  baseLayer: 'south-tyrol-orthophoto-2023',
  showSurveyAreas: true,
  prefetchingMapArea: false,
  prefetchStatus: '',
  isDrawing: false,
  isWalking: false,
  draftPointsLength: 0,
  draftAreaM2: 0,
  name: '',
  notes: '',
  saveError: '',
  isSaving: false,
  walkPoints: [],
  walkPointsLength: 0,
  walkAreaM2: 0,
  walkName: '',
  walkNotes: '',
  walkError: '',
  isWalkSaving: false,
  isWalkPointsOpen: false,
  selectedWalkPointIndex: null,
  selectedWalkPoint: null,
  editGeometryPointsLength: 0,
  selectedEditPointIndex: null,
  isAddingEditPoint: false,
  isEditing: false,
}

const initialWorkflowSlice: LivePositionWorkflowSlice = {
  mobilePanel: 'saved',
  isDrawing: false,
  draftPointsCount: 0,
  draftAreaM2: 0,
  name: '',
  notes: '',
  saveError: '',
  isSaving: false,
  isWalking: false,
  walkPoints: [],
  walkAreaM2: 0,
  walkName: '',
  walkNotes: '',
  walkError: '',
  isWalkSaving: false,
  isWalkPointsOpen: false,
  selectedWalkPointIndex: null,
  selectedWalkPoint: null,
  filteredEnclosures: [],
  selectedEnclosure: null,
  selectedEnclosureId: null,
  assignmentEditorEnclosureId: null,
  assignmentHerdId: '',
  assignmentCount: '',
  assignmentNotes: '',
  assignmentError: '',
  isAssignmentSaving: false,
  endingAssignmentId: null,
  safeHerds: [],
  herdsById: new Map(),
  animalsByHerdId: new Map(),
  activeAssignmentsByHerdId: new Map(),
  isSelectedEnclosureInfoOpen: false,
  showSelectedTrack: false,
}

const initialWorkflowHandles: LivePositionWorkflowHandles = {
  onStartDrawing: noop,
  onFinishDrawing: noop,
  onUndoLastPoint: noop,
  onClearDraft: noop,
  onNameChange: noop,
  onNotesChange: noop,
  onSaveEnclosure: noop,
  onToggleWalkPoints: noop,
  onSelectedWalkPointIndexChange: noop,
  onStartWalkMode: noop,
  onStopWalkMode: noop,
  onUndoLastWalkPoint: noop,
  onRemoveWalkPointAtIndex: noop,
  onDiscardWalkMode: noop,
  onWalkNameChange: noop,
  onWalkNotesChange: noop,
  onSaveWalkEnclosure: noop,
  onSelectedEnclosureChange: noop,
  onToggleSelectedEnclosureInfo: noop,
  onToggleShowSelectedTrack: noop,
  onOpenAssignmentEditor: noop,
  onCancelAssignmentEditor: noop,
  onAssignHerdToEnclosure: noop,
  onAssignmentHerdIdChange: noop,
  onAssignmentCountChange: noop,
  onAssignmentNotesChange: noop,
  onEndEnclosureAssignment: noop,
}

const initialSidebarSlice: LivePositionSidebarSlice = {
  mobilePanel: 'saved',
  safeSurveyAreas: [],
  selectedSurveyArea: null,
  selectedSurveyAreaId: null,
  filteredEnclosures: [],
  enclosureListFilter: 'all',
  selectedEnclosure: null,
  selectedEnclosureId: null,
  expandedSavedEnclosureId: null,
  assignmentEditorEnclosureId: null,
  assignmentHerdId: '',
  assignmentCount: '',
  assignmentNotes: '',
  assignmentError: '',
  isAssignmentSaving: false,
  endingAssignmentId: null,
  showSelectedTrack: false,
  selectedTrackSummary: {
    count: 0,
    avgAccuracyM: null,
    firstTimestamp: null,
    lastTimestamp: null,
  },
  safeHerds: [],
  herdsById: new Map(),
  animalsByHerdId: new Map(),
  activeAssignmentsByHerdId: new Map(),
  assignmentHistoryByEnclosureId: new Map(),
  editingEnclosureId: null,
  editName: '',
  editNotes: '',
  editError: '',
  isEditing: false,
  editGeometryPointsLength: 0,
  editAreaM2: 0,
  selectedEditPointIndex: null,
  isAddingEditPoint: false,
}

const initialSidebarHandles: LivePositionSidebarHandles = {
  onFocusSurveyArea: noop,
  onEnclosureListFilterChange: noop,
  onExpandedSavedEnclosureChange: noop,
  onToggleShowSelectedTrack: noop,
  onDeleteEnclosure: noop,
  onOpenAssignmentEditor: noop,
  onCancelAssignmentEditor: noop,
  onAssignHerdToEnclosure: noop,
  onAssignmentHerdIdChange: noop,
  onAssignmentCountChange: noop,
  onAssignmentNotesChange: noop,
  onEndEnclosureAssignment: noop,
  onEditNameChange: noop,
  onEditNotesChange: noop,
  onStartAddEditPoint: noop,
  onRemoveSelectedEditPoint: noop,
  onSaveEditedEnclosure: noop,
  onCancelEditEnclosure: noop,
}

type LivePositionMapStore = {
  isLiveStatusOpen: boolean
  status: LivePositionStatusSlice
  canvas: LivePositionCanvasSlice
  canvasHandles: LivePositionCanvasHandles
  workflow: LivePositionWorkflowSlice
  workflowHandles: LivePositionWorkflowHandles
  sidebar: LivePositionSidebarSlice
  sidebarHandles: LivePositionSidebarHandles
  toggleLiveStatus: () => void
  setStatus: (status: LivePositionStatusSlice) => void
  setCanvas: (canvas: LivePositionCanvasSlice) => void
  setCanvasHandles: (handles: LivePositionCanvasHandles) => void
  setWorkflow: (workflow: LivePositionWorkflowSlice) => void
  setWorkflowHandles: (handles: LivePositionWorkflowHandles) => void
  setSidebar: (sidebar: LivePositionSidebarSlice) => void
  setSidebarHandles: (handles: LivePositionSidebarHandles) => void
}

export const useLivePositionMapStore = create<LivePositionMapStore>((set) => ({
  isLiveStatusOpen: false,
  status: initialStatusSlice,
  canvas: initialCanvasSlice,
  canvasHandles: initialCanvasHandles,
  workflow: initialWorkflowSlice,
  workflowHandles: initialWorkflowHandles,
  sidebar: initialSidebarSlice,
  sidebarHandles: initialSidebarHandles,
  toggleLiveStatus: () => set((state) => ({ isLiveStatusOpen: !state.isLiveStatusOpen })),
  // Preserve the existing reference when nothing changed, so selector subscribers skip
  // re-rendering on unrelated screen updates.
  setStatus: (status) => set((state) => (shallow(state.status, status) ? state : { status })),
  setCanvas: (canvas) => set((state) => (shallow(state.canvas, canvas) ? state : { canvas })),
  setWorkflow: (workflow) =>
    set((state) => (shallow(state.workflow, workflow) ? state : { workflow })),
  setSidebar: (sidebar) =>
    set((state) => (shallow(state.sidebar, sidebar) ? state : { sidebar })),
  // The handles are referentially stable, so these effectively run once.
  setCanvasHandles: (handles) =>
    set((state) => (state.canvasHandles === handles ? state : { canvasHandles: handles })),
  setWorkflowHandles: (handles) =>
    set((state) => (state.workflowHandles === handles ? state : { workflowHandles: handles })),
  setSidebarHandles: (handles) =>
    set((state) => (state.sidebarHandles === handles ? state : { sidebarHandles: handles })),
}))
