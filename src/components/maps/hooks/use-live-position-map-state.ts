import { useMemo, useReducer, useRef } from 'react'
import { type GpsState, type PositionDecision } from '@/lib/maps/map-core'
import type {
  DraftPoint,
  EnclosureListFilter,
} from '@/lib/maps/live-position-map-helpers'
import type {
  MobilePanel,
  PositionData,
} from '@/components/maps/live-position-map-types'
import {
  createStateSliceSetterFactory,
  stateSliceReducer,
} from '@/components/maps/hooks/map-state-slice'

type LivePositionGpsState = {
  gpsState: GpsState
  position: PositionData | null
  lastPositionDecision: PositionDecision | null
  isLiveStatusOpen: boolean
}

type LivePositionDrawState = {
  draftPoints: DraftPoint[]
  isDrawing: boolean
  name: string
  notes: string
  saveError: string
  isSaving: boolean
}

type LivePositionWalkState = {
  walkPoints: PositionData[]
  isWalking: boolean
  walkName: string
  walkNotes: string
  walkError: string
  isWalkSaving: boolean
  selectedWalkPointIndex: number | null
  isWalkPointsOpen: boolean
}

type LivePositionSelectionState = {
  selectedEnclosureId: string | null
  showSelectedTrack: boolean
  isSelectedEnclosureInfoOpen: boolean
  expandedSavedEnclosureId: string | null
  mobilePanel: MobilePanel
  selectedSurveyAreaId: string | null
  enclosureListFilter: EnclosureListFilter
}

type LivePositionEditState = {
  editingEnclosureId: string | null
  editName: string
  editNotes: string
  editError: string
  isEditing: boolean
  editGeometryPoints: DraftPoint[]
  selectedEditPointIndex: number | null
  isAddingEditPoint: boolean
}

type LivePositionAssignmentState = {
  assignmentEditorEnclosureId: string | null
  assignmentHerdId: string
  assignmentCount: string
  assignmentNotes: string
  assignmentError: string
  isAssignmentSaving: boolean
  endingAssignmentId: string | null
}

const initialGpsState: LivePositionGpsState = {
  gpsState: 'idle',
  position: null,
  lastPositionDecision: null,
  isLiveStatusOpen: false,
}

const initialDrawState: LivePositionDrawState = {
  draftPoints: [],
  isDrawing: false,
  name: '',
  notes: '',
  saveError: '',
  isSaving: false,
}

const initialWalkState: LivePositionWalkState = {
  walkPoints: [],
  isWalking: false,
  walkName: '',
  walkNotes: '',
  walkError: '',
  isWalkSaving: false,
  selectedWalkPointIndex: null,
  isWalkPointsOpen: false,
}

const initialSelectionState: LivePositionSelectionState = {
  selectedEnclosureId: null,
  showSelectedTrack: false,
  isSelectedEnclosureInfoOpen: false,
  expandedSavedEnclosureId: null,
  mobilePanel: 'saved',
  selectedSurveyAreaId: null,
  enclosureListFilter: 'all',
}

const initialEditState: LivePositionEditState = {
  editingEnclosureId: null,
  editName: '',
  editNotes: '',
  editError: '',
  isEditing: false,
  editGeometryPoints: [],
  selectedEditPointIndex: null,
  isAddingEditPoint: false,
}

const initialAssignmentState: LivePositionAssignmentState = {
  assignmentEditorEnclosureId: null,
  assignmentHerdId: '',
  assignmentCount: '',
  assignmentNotes: '',
  assignmentError: '',
  isAssignmentSaving: false,
  endingAssignmentId: null,
}

export function useLivePositionMapState() {
  const watchIdRef = useRef<number | null>(null)
  const acceptedPositionRef = useRef<PositionData | null>(null)
  const openEnclosureDetailsRef = useRef<(enclosureId: string) => void>(() => {})

  const [gps, dispatchGps] = useReducer(stateSliceReducer<LivePositionGpsState>, initialGpsState)
  const [draw, dispatchDraw] = useReducer(
    stateSliceReducer<LivePositionDrawState>,
    initialDrawState,
  )
  const [walk, dispatchWalk] = useReducer(
    stateSliceReducer<LivePositionWalkState>,
    initialWalkState,
  )
  const [selection, dispatchSelection] = useReducer(
    stateSliceReducer<LivePositionSelectionState>,
    initialSelectionState,
  )
  const [edit, dispatchEdit] = useReducer(
    stateSliceReducer<LivePositionEditState>,
    initialEditState,
  )
  const [assignment, dispatchAssignment] = useReducer(
    stateSliceReducer<LivePositionAssignmentState>,
    initialAssignmentState,
  )

  const gpsSetters = useMemo(() => {
    const setGps = createStateSliceSetterFactory<LivePositionGpsState>(dispatchGps)

    return {
      setGpsState: setGps('gpsState'),
      setPosition: setGps('position'),
      setLastPositionDecision: setGps('lastPositionDecision'),
      setIsLiveStatusOpen: setGps('isLiveStatusOpen'),
    }
  }, [dispatchGps])

  const drawSetters = useMemo(() => {
    const setDraw = createStateSliceSetterFactory<LivePositionDrawState>(dispatchDraw)

    return {
      setDraftPoints: setDraw('draftPoints'),
      setIsDrawing: setDraw('isDrawing'),
      setName: setDraw('name'),
      setNotes: setDraw('notes'),
      setSaveError: setDraw('saveError'),
      setIsSaving: setDraw('isSaving'),
    }
  }, [dispatchDraw])

  const walkSetters = useMemo(() => {
    const setWalk = createStateSliceSetterFactory<LivePositionWalkState>(dispatchWalk)

    return {
      setWalkPoints: setWalk('walkPoints'),
      setIsWalking: setWalk('isWalking'),
      setWalkName: setWalk('walkName'),
      setWalkNotes: setWalk('walkNotes'),
      setWalkError: setWalk('walkError'),
      setIsWalkSaving: setWalk('isWalkSaving'),
      setSelectedWalkPointIndex: setWalk('selectedWalkPointIndex'),
      setIsWalkPointsOpen: setWalk('isWalkPointsOpen'),
    }
  }, [dispatchWalk])

  const selectionSetters = useMemo(() => {
    const setSelection =
      createStateSliceSetterFactory<LivePositionSelectionState>(dispatchSelection)

    return {
      setSelectedEnclosureId: setSelection('selectedEnclosureId'),
      setShowSelectedTrack: setSelection('showSelectedTrack'),
      setIsSelectedEnclosureInfoOpen: setSelection('isSelectedEnclosureInfoOpen'),
      setExpandedSavedEnclosureId: setSelection('expandedSavedEnclosureId'),
      setMobilePanel: setSelection('mobilePanel'),
      setSelectedSurveyAreaId: setSelection('selectedSurveyAreaId'),
      setEnclosureListFilter: setSelection('enclosureListFilter'),
    }
  }, [dispatchSelection])

  const editSetters = useMemo(() => {
    const setEdit = createStateSliceSetterFactory<LivePositionEditState>(dispatchEdit)

    return {
      setEditingEnclosureId: setEdit('editingEnclosureId'),
      setEditName: setEdit('editName'),
      setEditNotes: setEdit('editNotes'),
      setEditError: setEdit('editError'),
      setIsEditing: setEdit('isEditing'),
      setEditGeometryPoints: setEdit('editGeometryPoints'),
      setSelectedEditPointIndex: setEdit('selectedEditPointIndex'),
      setIsAddingEditPoint: setEdit('isAddingEditPoint'),
    }
  }, [dispatchEdit])

  const assignmentSetters = useMemo(() => {
    const setAssignment =
      createStateSliceSetterFactory<LivePositionAssignmentState>(dispatchAssignment)

    return {
      setAssignmentEditorEnclosureId: setAssignment('assignmentEditorEnclosureId'),
      setAssignmentHerdId: setAssignment('assignmentHerdId'),
      setAssignmentCount: setAssignment('assignmentCount'),
      setAssignmentNotes: setAssignment('assignmentNotes'),
      setAssignmentError: setAssignment('assignmentError'),
      setIsAssignmentSaving: setAssignment('isAssignmentSaving'),
      setEndingAssignmentId: setAssignment('endingAssignmentId'),
    }
  }, [dispatchAssignment])

  return {
    refs: {
      watchIdRef,
      acceptedPositionRef,
      openEnclosureDetailsRef,
    },
    gps: {
      ...gps,
      ...gpsSetters,
    },
    draw: {
      ...draw,
      ...drawSetters,
    },
    walk: {
      ...walk,
      ...walkSetters,
    },
    selection: {
      ...selection,
      ...selectionSetters,
    },
    edit: {
      ...edit,
      ...editSetters,
    },
    assignment: {
      ...assignment,
      ...assignmentSetters,
    },
  }
}

export type LivePositionMapState = ReturnType<typeof useLivePositionMapState>
