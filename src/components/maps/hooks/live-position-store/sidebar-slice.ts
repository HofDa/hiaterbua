import type { StateCreator } from 'zustand'
import {
  identityGuardedSetter,
  shallowGuardedSetter,
} from '@/components/maps/hooks/store-slice-helpers'
import type { FormEvent } from 'react'
import type {
  EnclosureListFilter,
  FilteredEnclosureItem,
  WalkTrackSummary,
} from '@/lib/maps/live-position-map-helpers'
import type { MobilePanel } from '@/components/maps/live-position-map-types'
import type {
  Animal,
  Enclosure,
  EnclosureAssignment,
  Herd,
  SurveyArea,
} from '@/types/domain'
import type { LivePositionMapStore } from './types'

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

const noop = () => {}

const initialSidebarSlice: LivePositionSidebarSlice = {
  mobilePanel: 'saved',
  safeSurveyAreas: [],
  selectedSurveyArea: null,
  selectedSurveyAreaId: null,
  filteredEnclosures: [],
  enclosureListFilter: 'active',
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

export type SidebarSlice = {
  sidebar: LivePositionSidebarSlice
  sidebarHandles: LivePositionSidebarHandles
  setSidebar: (sidebar: LivePositionSidebarSlice) => void
  setSidebarHandles: (handles: LivePositionSidebarHandles) => void
}

export const createSidebarSlice: StateCreator<LivePositionMapStore, [], [], SidebarSlice> = (
  set,
) => ({
  sidebar: initialSidebarSlice,
  sidebarHandles: initialSidebarHandles,
  setSidebar: shallowGuardedSetter(set, 'sidebar'),
  setSidebarHandles: identityGuardedSetter(set, 'sidebarHandles'),
})
