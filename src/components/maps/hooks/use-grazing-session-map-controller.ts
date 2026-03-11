import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { useGrazingSessionMapHistoryEditController } from '@/components/maps/hooks/use-grazing-session-map-history-edit-controller'
import { useGrazingSessionMapSessionController } from '@/components/maps/hooks/use-grazing-session-map-session-controller'
import type { EditableTrackPoint } from '@/lib/maps/grazing-session-map-helpers'
import type { PositionData } from '@/components/maps/grazing-session-map-types'
import type {
  Animal,
  GrazingSession,
  Herd,
  SessionStatus,
  TrackPoint,
} from '@/types/domain'

type UseGrazingSessionMapControllerOptions = {
  activeSession: GrazingSession | null
  selectedSession: GrazingSession | null
  groupedSessionHistory: Array<{ dayKey: string }>
  safeCurrentTrackpoints: TrackPoint[]
  safeSelectedTrackpoints: TrackPoint[]
  safeHerds: Herd[]
  animalsByHerdId: Map<string, Animal[]>
  acceptedPositionRef: MutableRefObject<PositionData | null>
  selectedHerdId: string
  sessionAnimalCount: number | null
  sessionNotes: string
  selectedSessionId: string | null
  editingSessionId: string | null
  editTrackpoints: EditableTrackPoint[]
  editStartTime: string
  editEndTime: string
  selectedEditTrackpointIndex: number | null
  setSelectedHerdId: Dispatch<SetStateAction<string>>
  setSessionAnimalCount: Dispatch<SetStateAction<number | null>>
  setSessionNotes: Dispatch<SetStateAction<string>>
  setCurrentSessionId: Dispatch<SetStateAction<string | null>>
  setCurrentSessionStatus: Dispatch<SetStateAction<SessionStatus | null>>
  setSelectedSessionId: Dispatch<SetStateAction<string | null>>
  setEditingSessionId: Dispatch<SetStateAction<string | null>>
  setEditTrackpoints: Dispatch<SetStateAction<EditableTrackPoint[]>>
  setEditStartTime: Dispatch<SetStateAction<string>>
  setEditEndTime: Dispatch<SetStateAction<string>>
  setSelectedEditTrackpointIndex: Dispatch<SetStateAction<number | null>>
  setIsAddingEditTrackpoint: Dispatch<SetStateAction<boolean>>
  setActionError: Dispatch<SetStateAction<string>>
  setIsSaving: Dispatch<SetStateAction<boolean>>
  setIsEventSaving: Dispatch<SetStateAction<boolean>>
  setEventNote: Dispatch<SetStateAction<string>>
  setEventStatus: Dispatch<SetStateAction<string>>
  setExpandedHistoryDays: Dispatch<SetStateAction<string[]>>
  setExpandedHistorySessionId: Dispatch<SetStateAction<string | null>>
  setLiveDurationTick: Dispatch<SetStateAction<number>>
}

export function useGrazingSessionMapController({
  activeSession,
  selectedSession,
  groupedSessionHistory,
  safeCurrentTrackpoints,
  safeSelectedTrackpoints,
  safeHerds,
  animalsByHerdId,
  acceptedPositionRef,
  selectedHerdId,
  sessionAnimalCount,
  sessionNotes,
  selectedSessionId,
  editingSessionId,
  editTrackpoints,
  editStartTime,
  editEndTime,
  selectedEditTrackpointIndex,
  setSelectedHerdId,
  setSessionAnimalCount,
  setSessionNotes,
  setCurrentSessionId,
  setCurrentSessionStatus,
  setSelectedSessionId,
  setEditingSessionId,
  setEditTrackpoints,
  setEditStartTime,
  setEditEndTime,
  setSelectedEditTrackpointIndex,
  setIsAddingEditTrackpoint,
  setActionError,
  setIsSaving,
  setIsEventSaving,
  setEventNote,
  setEventStatus,
  setExpandedHistoryDays,
  setExpandedHistorySessionId,
  setLiveDurationTick,
}: UseGrazingSessionMapControllerOptions) {
  const sessionController = useGrazingSessionMapSessionController({
    activeSession,
    safeCurrentTrackpoints,
    safeHerds,
    animalsByHerdId,
    acceptedPositionRef,
    selectedHerdId,
    sessionAnimalCount,
    sessionNotes,
    setSelectedHerdId,
    setSessionAnimalCount,
    setSessionNotes,
    setCurrentSessionId,
    setCurrentSessionStatus,
    setSelectedSessionId,
    setActionError,
    setIsSaving,
    setIsEventSaving,
    setEventNote,
    setEventStatus,
    setLiveDurationTick,
  })

  const historyEditController = useGrazingSessionMapHistoryEditController({
    activeSession,
    selectedSession,
    groupedSessionHistory,
    safeSelectedTrackpoints,
    selectedSessionId,
    editingSessionId,
    editTrackpoints,
    editStartTime,
    editEndTime,
    selectedEditTrackpointIndex,
    setSelectedSessionId,
    setEditingSessionId,
    setEditTrackpoints,
    setEditStartTime,
    setEditEndTime,
    setSelectedEditTrackpointIndex,
    setIsAddingEditTrackpoint,
    setActionError,
    setIsSaving,
    setExpandedHistoryDays,
    setExpandedHistorySessionId,
  })

  return {
    ...sessionController,
    ...historyEditController,
  }
}
