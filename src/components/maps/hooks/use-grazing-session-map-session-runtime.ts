import { useEffect, useMemo, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import {
  applyActiveSessionToRuntimeState,
  clearRuntimeSessionState,
  syncTrackpointsToRuntime,
  type GrazingSessionRuntimeRefs,
} from '@/components/maps/hooks/grazing-session-map-session-controller-helpers'
import type {
  Animal,
  GrazingSession,
  Herd,
  SessionStatus,
  TrackPoint,
} from '@/types/domain'

type UseGrazingSessionMapSessionRuntimeOptions = {
  activeSession: GrazingSession | null
  safeCurrentTrackpoints: TrackPoint[]
  safeHerds: Herd[]
  animalsByHerdId: Map<string, Animal[]>
  selectedHerdId: string
  setSelectedHerdId: Dispatch<SetStateAction<string>>
  setSessionAnimalCount: Dispatch<SetStateAction<number | null>>
  setSessionNotes: Dispatch<SetStateAction<string>>
  setCurrentSessionId: Dispatch<SetStateAction<string | null>>
  setCurrentSessionStatus: Dispatch<SetStateAction<SessionStatus | null>>
  setEventNote: Dispatch<SetStateAction<string>>
  setEventStatus: Dispatch<SetStateAction<string>>
  setLiveDurationTick: Dispatch<SetStateAction<number>>
}

export function useGrazingSessionMapSessionRuntime({
  activeSession,
  safeCurrentTrackpoints,
  safeHerds,
  animalsByHerdId,
  selectedHerdId,
  setSelectedHerdId,
  setSessionAnimalCount,
  setSessionNotes,
  setCurrentSessionId,
  setCurrentSessionStatus,
  setEventNote,
  setEventStatus,
  setLiveDurationTick,
}: UseGrazingSessionMapSessionRuntimeOptions): GrazingSessionRuntimeRefs {
  const currentSessionIdRef = useRef<string | null>(null)
  const currentSessionStatusRef = useRef<SessionStatus | null>(null)
  const currentSessionStartTimeRef = useRef<string | null>(null)
  const currentTrackpointsRef = useRef<TrackPoint[]>([])
  const currentSeqRef = useRef(0)
  const currentLastTimestampRef = useRef<number | null>(null)
  const runtimeRefs = useMemo(
    () => ({
      currentSessionIdRef,
      currentSessionStatusRef,
      currentSessionStartTimeRef,
      currentTrackpointsRef,
      currentSeqRef,
      currentLastTimestampRef,
    }),
    []
  )

  useEffect(() => {
    if (activeSession?.status !== 'active') return

    const intervalId = window.setInterval(() => {
      setLiveDurationTick(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [activeSession?.status, setLiveDurationTick])

  useEffect(() => {
    syncTrackpointsToRuntime(runtimeRefs, safeCurrentTrackpoints)
  }, [runtimeRefs, safeCurrentTrackpoints])

  useEffect(() => {
    if (!activeSession) return

    applyActiveSessionToRuntimeState({
      runtimeRefs,
      activeSession,
      safeHerds,
      animalsByHerdId,
      setCurrentSessionId,
      setCurrentSessionStatus,
      setSelectedHerdId,
      setSessionAnimalCount,
      setSessionNotes,
    })
  }, [
    activeSession,
    animalsByHerdId,
    safeHerds,
    setCurrentSessionId,
    setCurrentSessionStatus,
    setSelectedHerdId,
    setSessionAnimalCount,
    setSessionNotes,
    runtimeRefs,
  ])

  useEffect(() => {
    if (activeSession) return
    if (currentSessionStatusRef.current === null && currentSessionIdRef.current === null) return

    clearRuntimeSessionState({
      runtimeRefs,
      selectedHerdId,
      safeHerds,
      animalsByHerdId,
      setCurrentSessionId,
      setCurrentSessionStatus,
      setSessionAnimalCount,
      setEventNote,
      setEventStatus,
    })
  }, [
    activeSession,
    animalsByHerdId,
    safeHerds,
    selectedHerdId,
    setCurrentSessionId,
    setCurrentSessionStatus,
    setEventNote,
    setEventStatus,
    setSessionAnimalCount,
    runtimeRefs,
  ])

  return runtimeRefs
}
