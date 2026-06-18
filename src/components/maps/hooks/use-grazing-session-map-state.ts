import { useMemo, useReducer, useRef } from 'react'
import { type GpsState, type PositionDecision } from '@/lib/maps/map-core'
import type { EditableTrackPoint } from '@/lib/maps/grazing-session-map-helpers'
import type { PositionData } from '@/components/maps/grazing-session-map-types'
import {
  createStateSliceSetterFactory,
  stateSliceReducer,
} from '@/components/maps/hooks/map-state-slice'
import type { SessionStatus } from '@/types/domain'

type GrazingSessionGpsState = {
  gpsState: GpsState
  position: PositionData | null
  lastPositionDecision: PositionDecision | null
}

type GrazingSessionSelectionState = {
  selectedSurveyAreaId: string | null
  selectedSessionId: string | null
}

type GrazingSessionCurrentState = {
  selectedHerdId: string
  sessionAnimalCount: number | null
  sessionNotes: string
  currentSessionId: string | null
  currentSessionStatus: SessionStatus | null
  actionError: string
  isSaving: boolean
  isEventSaving: boolean
  eventNote: string
  eventStatus: string
  liveDurationTick: number
}

type GrazingSessionEditState = {
  editingSessionId: string | null
  editTrackpoints: EditableTrackPoint[]
  editStartTime: string
  editEndTime: string
  selectedEditTrackpointIndex: number | null
  isAddingEditTrackpoint: boolean
}

type GrazingSessionHistoryState = {
  isHistoryExpanded: boolean
  expandedHistoryDays: string[]
  expandedHistorySessionId: string | null
}

const initialGpsState: GrazingSessionGpsState = {
  gpsState: 'idle',
  position: null,
  lastPositionDecision: null,
}

const initialSelectionState: GrazingSessionSelectionState = {
  selectedSurveyAreaId: null,
  selectedSessionId: null,
}

function createInitialSessionState(): GrazingSessionCurrentState {
  return {
    selectedHerdId: '',
    sessionAnimalCount: null,
    sessionNotes: '',
    currentSessionId: null,
    currentSessionStatus: null,
    actionError: '',
    isSaving: false,
    isEventSaving: false,
    eventNote: '',
    eventStatus: '',
    liveDurationTick: Date.now(),
  }
}

const initialEditState: GrazingSessionEditState = {
  editingSessionId: null,
  editTrackpoints: [],
  editStartTime: '',
  editEndTime: '',
  selectedEditTrackpointIndex: null,
  isAddingEditTrackpoint: false,
}

const initialHistoryState: GrazingSessionHistoryState = {
  isHistoryExpanded: false,
  expandedHistoryDays: [],
  expandedHistorySessionId: null,
}

export function useGrazingSessionMapState() {
  const watchIdRef = useRef<number | null>(null)
  const acceptedPositionRef = useRef<PositionData | null>(null)

  const [gps, dispatchGps] = useReducer(stateSliceReducer<GrazingSessionGpsState>, initialGpsState)
  const [selection, dispatchSelection] = useReducer(
    stateSliceReducer<GrazingSessionSelectionState>,
    initialSelectionState,
  )
  const [session, dispatchSession] = useReducer(
    stateSliceReducer<GrazingSessionCurrentState>,
    undefined,
    createInitialSessionState,
  )
  const [edit, dispatchEdit] = useReducer(
    stateSliceReducer<GrazingSessionEditState>,
    initialEditState,
  )
  const [history, dispatchHistory] = useReducer(
    stateSliceReducer<GrazingSessionHistoryState>,
    initialHistoryState,
  )

  const gpsSetters = useMemo(() => {
    const setGps = createStateSliceSetterFactory<GrazingSessionGpsState>(dispatchGps)

    return {
      setGpsState: setGps('gpsState'),
      setPosition: setGps('position'),
      setLastPositionDecision: setGps('lastPositionDecision'),
    }
  }, [dispatchGps])

  const selectionSetters = useMemo(() => {
    const setSelection =
      createStateSliceSetterFactory<GrazingSessionSelectionState>(dispatchSelection)

    return {
      setSelectedSurveyAreaId: setSelection('selectedSurveyAreaId'),
      setSelectedSessionId: setSelection('selectedSessionId'),
    }
  }, [dispatchSelection])

  const sessionSetters = useMemo(() => {
    const setSession =
      createStateSliceSetterFactory<GrazingSessionCurrentState>(dispatchSession)

    return {
      setSelectedHerdId: setSession('selectedHerdId'),
      setSessionAnimalCount: setSession('sessionAnimalCount'),
      setSessionNotes: setSession('sessionNotes'),
      setCurrentSessionId: setSession('currentSessionId'),
      setCurrentSessionStatus: setSession('currentSessionStatus'),
      setActionError: setSession('actionError'),
      setIsSaving: setSession('isSaving'),
      setIsEventSaving: setSession('isEventSaving'),
      setEventNote: setSession('eventNote'),
      setEventStatus: setSession('eventStatus'),
      setLiveDurationTick: setSession('liveDurationTick'),
    }
  }, [dispatchSession])

  const editSetters = useMemo(() => {
    const setEdit = createStateSliceSetterFactory<GrazingSessionEditState>(dispatchEdit)

    return {
      setEditingSessionId: setEdit('editingSessionId'),
      setEditTrackpoints: setEdit('editTrackpoints'),
      setEditStartTime: setEdit('editStartTime'),
      setEditEndTime: setEdit('editEndTime'),
      setSelectedEditTrackpointIndex: setEdit('selectedEditTrackpointIndex'),
      setIsAddingEditTrackpoint: setEdit('isAddingEditTrackpoint'),
    }
  }, [dispatchEdit])

  const historySetters = useMemo(() => {
    const setHistory =
      createStateSliceSetterFactory<GrazingSessionHistoryState>(dispatchHistory)

    return {
      setIsHistoryExpanded: setHistory('isHistoryExpanded'),
      setExpandedHistoryDays: setHistory('expandedHistoryDays'),
      setExpandedHistorySessionId: setHistory('expandedHistorySessionId'),
    }
  }, [dispatchHistory])

  return {
    refs: {
      watchIdRef,
      acceptedPositionRef,
    },
    gps: {
      ...gps,
      ...gpsSetters,
    },
    selection: {
      ...selection,
      ...selectionSetters,
    },
    session: {
      ...session,
      ...sessionSetters,
    },
    edit: {
      ...edit,
      ...editSetters,
    },
    history: {
      ...history,
      ...historySetters,
    },
  }
}

export type GrazingSessionMapState = ReturnType<typeof useGrazingSessionMapState>
