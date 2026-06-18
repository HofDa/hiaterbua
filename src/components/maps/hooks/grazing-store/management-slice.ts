import type { StateCreator } from 'zustand'
import {
  identityGuardedSetter,
  shallowGuardedSetter,
} from '@/components/maps/hooks/store-slice-helpers'
import type { SessionMetrics } from '@/lib/maps/grazing-session-map-helpers'
import type {
  Herd,
  SessionEvent,
  SessionEventType,
  SessionStatus,
} from '@/types/domain'
import type { GrazingSessionMapStore } from './types'

/** Values the management panel renders. Pushed from the screen hook (shallow-guarded). */
export type GrazingManagementSlice = {
  safeHerds: Herd[]
  selectedHerdId: string
  selectedAnimalCount: number | null
  sessionNotes: string
  currentSessionStatus: SessionStatus | null
  isSaving: boolean
  isEventSaving: boolean
  eventNote: string
  eventStatus: string
  actionError: string
  safeCurrentTrackpointsLength: number
  currentMetrics: SessionMetrics | null
  safeCurrentSessionEvents: SessionEvent[]
}

/** Management panel callbacks. Stabilized via `useStableHandles`, so this object is set once. */
export type GrazingManagementHandles = {
  onSelectedHerdIdChange: (value: string) => void
  onAdjustAnimalCount: (delta: number) => void | Promise<void>
  onSessionNotesChange: (value: string) => void
  onStartSession: () => void | Promise<void>
  onPauseSession: () => void | Promise<void>
  onResumeSession: () => void | Promise<void>
  onStopSession: () => void | Promise<void>
  onEventNoteChange: (value: string) => void
  onAddSessionMarkerEvent: (type: SessionEventType, comment?: string) => void | Promise<void>
}

const noop = () => {}

const initialManagementSlice: GrazingManagementSlice = {
  safeHerds: [],
  selectedHerdId: '',
  selectedAnimalCount: null,
  sessionNotes: '',
  currentSessionStatus: null,
  isSaving: false,
  isEventSaving: false,
  eventNote: '',
  eventStatus: '',
  actionError: '',
  safeCurrentTrackpointsLength: 0,
  currentMetrics: null,
  safeCurrentSessionEvents: [],
}

const initialManagementHandles: GrazingManagementHandles = {
  onSelectedHerdIdChange: noop,
  onAdjustAnimalCount: noop,
  onSessionNotesChange: noop,
  onStartSession: noop,
  onPauseSession: noop,
  onResumeSession: noop,
  onStopSession: noop,
  onEventNoteChange: noop,
  onAddSessionMarkerEvent: noop,
}

export type ManagementSlice = {
  management: GrazingManagementSlice
  managementHandles: GrazingManagementHandles
  setManagement: (management: GrazingManagementSlice) => void
  setManagementHandles: (handles: GrazingManagementHandles) => void
}

export const createManagementSlice: StateCreator<
  GrazingSessionMapStore,
  [],
  [],
  ManagementSlice
> = (set) => ({
  management: initialManagementSlice,
  managementHandles: initialManagementHandles,
  setManagement: shallowGuardedSetter(set, 'management'),
  setManagementHandles: identityGuardedSetter(set, 'managementHandles'),
})
