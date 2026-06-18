import type { StateCreator } from 'zustand'
import { shallow } from 'zustand/shallow'
import type { FormEvent } from 'react'
import type { FilteredEnclosureItem } from '@/lib/maps/live-position-map-helpers'
import type {
  MobilePanel,
  PositionData,
} from '@/components/maps/live-position-map-types'
import type {
  Animal,
  Enclosure,
  EnclosureAssignment,
  Herd,
} from '@/types/domain'
import type { LivePositionMapStore } from './types'

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

const noop = () => {}

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

export type WorkflowSlice = {
  workflow: LivePositionWorkflowSlice
  workflowHandles: LivePositionWorkflowHandles
  setWorkflow: (workflow: LivePositionWorkflowSlice) => void
  setWorkflowHandles: (handles: LivePositionWorkflowHandles) => void
}

export const createWorkflowSlice: StateCreator<LivePositionMapStore, [], [], WorkflowSlice> = (
  set,
) => ({
  workflow: initialWorkflowSlice,
  workflowHandles: initialWorkflowHandles,
  setWorkflow: (workflow) =>
    set((state) => (shallow(state.workflow, workflow) ? state : { workflow })),
  setWorkflowHandles: (handles) =>
    set((state) => (state.workflowHandles === handles ? state : { workflowHandles: handles })),
})
