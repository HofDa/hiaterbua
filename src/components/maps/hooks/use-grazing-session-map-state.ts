import { useRef, useState } from 'react'
import { type GpsState, type PositionDecision } from '@/lib/maps/map-core'
import type { EditableTrackPoint } from '@/lib/maps/grazing-session-map-helpers'
import type { PositionData } from '@/components/maps/grazing-session-map-types'
import type { SessionStatus } from '@/types/domain'

export function useGrazingSessionMapState() {
  const watchIdRef = useRef<number | null>(null)
  const acceptedPositionRef = useRef<PositionData | null>(null)

  const [gpsState, setGpsState] = useState<GpsState>('idle')
  const [position, setPosition] = useState<PositionData | null>(null)
  const [lastPositionDecision, setLastPositionDecision] = useState<PositionDecision | null>(null)
  const [isLiveStatusOpen, setIsLiveStatusOpen] = useState(false)

  const [selectedSurveyAreaId, setSelectedSurveyAreaId] = useState<string | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [selectedHerdId, setSelectedHerdId] = useState('')
  const [sessionAnimalCount, setSessionAnimalCount] = useState<number | null>(null)
  const [sessionNotes, setSessionNotes] = useState('')
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [currentSessionStatus, setCurrentSessionStatus] = useState<SessionStatus | null>(null)
  const [actionError, setActionError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isEventSaving, setIsEventSaving] = useState(false)
  const [eventNote, setEventNote] = useState('')
  const [eventStatus, setEventStatus] = useState('')
  const [liveDurationTick, setLiveDurationTick] = useState(() => Date.now())

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editTrackpoints, setEditTrackpoints] = useState<EditableTrackPoint[]>([])
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [selectedEditTrackpointIndex, setSelectedEditTrackpointIndex] = useState<number | null>(
    null
  )
  const [isAddingEditTrackpoint, setIsAddingEditTrackpoint] = useState(false)

  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false)
  const [expandedHistoryDays, setExpandedHistoryDays] = useState<string[]>([])
  const [expandedHistorySessionId, setExpandedHistorySessionId] = useState<string | null>(null)

  return {
    refs: {
      watchIdRef,
      acceptedPositionRef,
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
    selection: {
      selectedSurveyAreaId,
      setSelectedSurveyAreaId,
      selectedSessionId,
      setSelectedSessionId,
    },
    session: {
      selectedHerdId,
      setSelectedHerdId,
      sessionAnimalCount,
      setSessionAnimalCount,
      sessionNotes,
      setSessionNotes,
      currentSessionId,
      setCurrentSessionId,
      currentSessionStatus,
      setCurrentSessionStatus,
      actionError,
      setActionError,
      isSaving,
      setIsSaving,
      isEventSaving,
      setIsEventSaving,
      eventNote,
      setEventNote,
      eventStatus,
      setEventStatus,
      liveDurationTick,
      setLiveDurationTick,
    },
    edit: {
      editingSessionId,
      setEditingSessionId,
      editTrackpoints,
      setEditTrackpoints,
      editStartTime,
      setEditStartTime,
      editEndTime,
      setEditEndTime,
      selectedEditTrackpointIndex,
      setSelectedEditTrackpointIndex,
      isAddingEditTrackpoint,
      setIsAddingEditTrackpoint,
    },
    history: {
      isHistoryExpanded,
      setIsHistoryExpanded,
      expandedHistoryDays,
      setExpandedHistoryDays,
      expandedHistorySessionId,
      setExpandedHistorySessionId,
    },
  }
}

export type GrazingSessionMapState = ReturnType<typeof useGrazingSessionMapState>
