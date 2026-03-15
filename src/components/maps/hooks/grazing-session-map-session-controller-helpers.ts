import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { getEffectiveHerdCount } from '@/lib/maps/live-position-map-helpers'
import type {
  Animal,
  GrazingSession,
  Herd,
  SessionStatus,
  TrackPoint,
} from '@/types/domain'

export type GrazingSessionRuntimeRefs = {
  currentSessionIdRef: MutableRefObject<string | null>
  currentSessionStatusRef: MutableRefObject<SessionStatus | null>
  currentSessionStartTimeRef: MutableRefObject<string | null>
  currentTrackpointsRef: MutableRefObject<TrackPoint[]>
  currentSeqRef: MutableRefObject<number>
  currentLastTimestampRef: MutableRefObject<number | null>
}

type BaseRuntimeStateOptions = {
  runtimeRefs: GrazingSessionRuntimeRefs
  setCurrentSessionId: Dispatch<SetStateAction<string | null>>
  setCurrentSessionStatus: Dispatch<SetStateAction<SessionStatus | null>>
}

type ActiveSessionRuntimeStateOptions = BaseRuntimeStateOptions & {
  activeSession: GrazingSession
  safeHerds: Herd[]
  animalsByHerdId: Map<string, Animal[]>
  setSelectedHerdId: Dispatch<SetStateAction<string>>
  setSessionAnimalCount: Dispatch<SetStateAction<number | null>>
  setSessionNotes: Dispatch<SetStateAction<string>>
}

type ClearRuntimeStateOptions = BaseRuntimeStateOptions & {
  selectedHerdId: string
  safeHerds: Herd[]
  animalsByHerdId: Map<string, Animal[]>
  setSessionAnimalCount: Dispatch<SetStateAction<number | null>>
  setEventNote: Dispatch<SetStateAction<string>>
  setEventStatus: Dispatch<SetStateAction<string>>
  setSessionNotes?: Dispatch<SetStateAction<string>>
}

export function getDefaultAnimalCount(
  herdId: string,
  safeHerds: Herd[],
  animalsByHerdId: Map<string, Animal[]>
) {
  if (!herdId) return 0

  const herd = safeHerds.find((currentHerd) => currentHerd.id === herdId)
  return Math.max(0, getEffectiveHerdCount(herd, animalsByHerdId.get(herdId) ?? []) ?? 0)
}

export function syncTrackpointsToRuntime(
  runtimeRefs: GrazingSessionRuntimeRefs,
  safeCurrentTrackpoints: TrackPoint[]
) {
  runtimeRefs.currentTrackpointsRef.current = safeCurrentTrackpoints
  runtimeRefs.currentSeqRef.current =
    safeCurrentTrackpoints.length > 0
      ? safeCurrentTrackpoints[safeCurrentTrackpoints.length - 1].seq
      : 0
  runtimeRefs.currentLastTimestampRef.current =
    safeCurrentTrackpoints.length > 0
      ? new Date(safeCurrentTrackpoints[safeCurrentTrackpoints.length - 1].timestamp).getTime()
      : null
}

export function applyActiveSessionToRuntimeState({
  runtimeRefs,
  activeSession,
  safeHerds,
  animalsByHerdId,
  setCurrentSessionId,
  setCurrentSessionStatus,
  setSelectedHerdId,
  setSessionAnimalCount,
  setSessionNotes,
}: ActiveSessionRuntimeStateOptions) {
  runtimeRefs.currentSessionIdRef.current = activeSession.id
  runtimeRefs.currentSessionStatusRef.current = activeSession.status
  runtimeRefs.currentSessionStartTimeRef.current = activeSession.startTime
  setCurrentSessionId(activeSession.id)
  setCurrentSessionStatus(activeSession.status)
  setSelectedHerdId(activeSession.herdId)
  setSessionAnimalCount(
    activeSession.animalCount ??
      getDefaultAnimalCount(activeSession.herdId, safeHerds, animalsByHerdId)
  )
  setSessionNotes(activeSession.notes ?? '')
}

export function clearRuntimeSessionState({
  runtimeRefs,
  selectedHerdId,
  safeHerds,
  animalsByHerdId,
  setCurrentSessionId,
  setCurrentSessionStatus,
  setSessionAnimalCount,
  setEventNote,
  setEventStatus,
  setSessionNotes,
}: ClearRuntimeStateOptions) {
  runtimeRefs.currentSessionIdRef.current = null
  runtimeRefs.currentSessionStatusRef.current = null
  runtimeRefs.currentSessionStartTimeRef.current = null
  runtimeRefs.currentTrackpointsRef.current = []
  runtimeRefs.currentSeqRef.current = 0
  runtimeRefs.currentLastTimestampRef.current = null
  setCurrentSessionId(null)
  setCurrentSessionStatus(null)
  setSessionAnimalCount(
    selectedHerdId ? getDefaultAnimalCount(selectedHerdId, safeHerds, animalsByHerdId) : null
  )
  setEventNote('')
  setEventStatus('')
  setSessionNotes?.('')
}
