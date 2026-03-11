import { useRef, useState } from 'react'
import { type GpsState, type PositionDecision } from '@/lib/maps/map-core'
import type {
  DraftPoint,
  EnclosureListFilter,
} from '@/lib/maps/live-position-map-helpers'
import type {
  MobilePanel,
  PositionData,
} from '@/components/maps/live-position-map-types'

export function useLivePositionMapState() {
  const watchIdRef = useRef<number | null>(null)
  const acceptedPositionRef = useRef<PositionData | null>(null)
  const openEnclosureDetailsRef = useRef<(enclosureId: string) => void>(() => {})

  const [gpsState, setGpsState] = useState<GpsState>('idle')
  const [position, setPosition] = useState<PositionData | null>(null)
  const [lastPositionDecision, setLastPositionDecision] =
    useState<PositionDecision | null>(null)
  const [isLiveStatusOpen, setIsLiveStatusOpen] = useState(false)

  const [draftPoints, setDraftPoints] = useState<DraftPoint[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [walkPoints, setWalkPoints] = useState<PositionData[]>([])
  const [isWalking, setIsWalking] = useState(false)
  const [walkName, setWalkName] = useState('')
  const [walkNotes, setWalkNotes] = useState('')
  const [walkError, setWalkError] = useState('')
  const [isWalkSaving, setIsWalkSaving] = useState(false)
  const [selectedWalkPointIndex, setSelectedWalkPointIndex] = useState<number | null>(null)
  const [isWalkPointsOpen, setIsWalkPointsOpen] = useState(false)

  const [selectedEnclosureId, setSelectedEnclosureId] = useState<string | null>(null)
  const [showSelectedTrack, setShowSelectedTrack] = useState(false)
  const [isSelectedEnclosureInfoOpen, setIsSelectedEnclosureInfoOpen] = useState(false)
  const [expandedSavedEnclosureId, setExpandedSavedEnclosureId] = useState<string | null>(
    null
  )
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('draw')
  const [selectedSurveyAreaId, setSelectedSurveyAreaId] = useState<string | null>(null)
  const [enclosureListFilter, setEnclosureListFilter] =
    useState<EnclosureListFilter>('all')

  const [editingEnclosureId, setEditingEnclosureId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editError, setEditError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editGeometryPoints, setEditGeometryPoints] = useState<DraftPoint[]>([])
  const [selectedEditPointIndex, setSelectedEditPointIndex] = useState<number | null>(null)
  const [isAddingEditPoint, setIsAddingEditPoint] = useState(false)

  const [assignmentEditorEnclosureId, setAssignmentEditorEnclosureId] = useState<
    string | null
  >(null)
  const [assignmentHerdId, setAssignmentHerdId] = useState('')
  const [assignmentCount, setAssignmentCount] = useState('')
  const [assignmentNotes, setAssignmentNotes] = useState('')
  const [assignmentError, setAssignmentError] = useState('')
  const [isAssignmentSaving, setIsAssignmentSaving] = useState(false)
  const [endingAssignmentId, setEndingAssignmentId] = useState<string | null>(null)

  return {
    refs: {
      watchIdRef,
      acceptedPositionRef,
      openEnclosureDetailsRef,
    },
    gps: {
      gpsState,
      setGpsState,
      position,
      setPosition,
      lastPositionDecision,
      setLastPositionDecision,
      isLiveStatusOpen,
      setIsLiveStatusOpen,
    },
    draw: {
      draftPoints,
      setDraftPoints,
      isDrawing,
      setIsDrawing,
      name,
      setName,
      notes,
      setNotes,
      saveError,
      setSaveError,
      isSaving,
      setIsSaving,
    },
    walk: {
      walkPoints,
      setWalkPoints,
      isWalking,
      setIsWalking,
      walkName,
      setWalkName,
      walkNotes,
      setWalkNotes,
      walkError,
      setWalkError,
      isWalkSaving,
      setIsWalkSaving,
      selectedWalkPointIndex,
      setSelectedWalkPointIndex,
      isWalkPointsOpen,
      setIsWalkPointsOpen,
    },
    selection: {
      selectedEnclosureId,
      setSelectedEnclosureId,
      showSelectedTrack,
      setShowSelectedTrack,
      isSelectedEnclosureInfoOpen,
      setIsSelectedEnclosureInfoOpen,
      expandedSavedEnclosureId,
      setExpandedSavedEnclosureId,
      mobilePanel,
      setMobilePanel,
      selectedSurveyAreaId,
      setSelectedSurveyAreaId,
      enclosureListFilter,
      setEnclosureListFilter,
    },
    edit: {
      editingEnclosureId,
      setEditingEnclosureId,
      editName,
      setEditName,
      editNotes,
      setEditNotes,
      editError,
      setEditError,
      isEditing,
      setIsEditing,
      editGeometryPoints,
      setEditGeometryPoints,
      selectedEditPointIndex,
      setSelectedEditPointIndex,
      isAddingEditPoint,
      setIsAddingEditPoint,
    },
    assignment: {
      assignmentEditorEnclosureId,
      setAssignmentEditorEnclosureId,
      assignmentHerdId,
      setAssignmentHerdId,
      assignmentCount,
      setAssignmentCount,
      assignmentNotes,
      setAssignmentNotes,
      assignmentError,
      setAssignmentError,
      isAssignmentSaving,
      setIsAssignmentSaving,
      endingAssignmentId,
      setEndingAssignmentId,
    },
  }
}

export type LivePositionMapState = ReturnType<typeof useLivePositionMapState>
