import type { StateCreator } from 'zustand'
import { shallow } from 'zustand/shallow'
import type {
  GroupedSessionHistory,
  SessionHistoryStats,
  SessionMetrics,
} from '@/lib/maps/grazing-session-map-helpers'
import type {
  GrazingSession,
  Herd,
  SessionEvent,
  SurveyArea,
  TrackPoint,
} from '@/types/domain'
import type { GrazingSessionMapStore } from './types'

/** Values the history panel renders. Pushed from the screen hook (shallow-guarded). */
export type GrazingHistorySlice = {
  isHistoryExpanded: boolean
  safeRecentSessions: GrazingSession[]
  safeHerds: Herd[]
  safeSurveyAreas: SurveyArea[]
  selectedSurveyArea: SurveyArea | null
  selectedSurveyAreaId: string | null
  sessionHistoryStats: SessionHistoryStats
  groupedSessionHistory: GroupedSessionHistory[]
  expandedHistoryDays: string[]
  expandedHistorySessionId: string | null
  selectedSessionId: string | null
  selectedSession: GrazingSession | null
  selectedMetrics: SessionMetrics | null
  safeSelectedTrackpoints: TrackPoint[]
  safeSelectedSessionEvents: SessionEvent[]
  editingSessionId: string | null
  editMetrics: SessionMetrics | null
  editTrackpointsLength: number
  editStartTime: string
  editEndTime: string
  actionError: string
  isSaving: boolean
}

/** History panel callbacks. Stabilized via `useStableHandles`, so this object is set once. */
export type GrazingHistoryHandles = {
  onToggleHistoryExpanded: () => void
  onToggleHistoryDay: (dayKey: string) => void
  onExpandedHistorySessionChange: (sessionId: string) => void
  onFocusSurveyArea: (surveyArea: SurveyArea) => void
  onSelectSession: (sessionId: string) => void
  onStartEditSession: (sessionId: string) => void
  onEditStartTimeChange: (value: string) => void
  onEditEndTimeChange: (value: string) => void
  onSaveEditedSession: () => void | Promise<void>
  onCancelEditSession: () => void
  onDeleteSession: (session: GrazingSession) => void | Promise<void>
}

const noop = () => {}

const initialHistorySlice: GrazingHistorySlice = {
  isHistoryExpanded: false,
  safeRecentSessions: [],
  safeHerds: [],
  safeSurveyAreas: [],
  selectedSurveyArea: null,
  selectedSurveyAreaId: null,
  sessionHistoryStats: {
    totalSessions: 0,
    finishedSessions: 0,
    totalDistanceM: 0,
    totalDurationS: 0,
    uniqueHerds: 0,
  },
  groupedSessionHistory: [],
  expandedHistoryDays: [],
  expandedHistorySessionId: null,
  selectedSessionId: null,
  selectedSession: null,
  selectedMetrics: null,
  safeSelectedTrackpoints: [],
  safeSelectedSessionEvents: [],
  editingSessionId: null,
  editMetrics: null,
  editTrackpointsLength: 0,
  editStartTime: '',
  editEndTime: '',
  actionError: '',
  isSaving: false,
}

const initialHistoryHandles: GrazingHistoryHandles = {
  onToggleHistoryExpanded: noop,
  onToggleHistoryDay: noop,
  onExpandedHistorySessionChange: noop,
  onFocusSurveyArea: noop,
  onSelectSession: noop,
  onStartEditSession: noop,
  onEditStartTimeChange: noop,
  onEditEndTimeChange: noop,
  onSaveEditedSession: noop,
  onCancelEditSession: noop,
  onDeleteSession: noop,
}

export type HistorySlice = {
  history: GrazingHistorySlice
  historyHandles: GrazingHistoryHandles
  setHistory: (history: GrazingHistorySlice) => void
  setHistoryHandles: (handles: GrazingHistoryHandles) => void
}

export const createHistorySlice: StateCreator<GrazingSessionMapStore, [], [], HistorySlice> = (
  set,
) => ({
  history: initialHistorySlice,
  historyHandles: initialHistoryHandles,
  setHistory: (history) =>
    set((state) => (shallow(state.history, history) ? state : { history })),
  setHistoryHandles: (handles) =>
    set((state) => (state.historyHandles === handles ? state : { historyHandles: handles })),
})
