import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import {
  addGrazingSessionEventRecord,
  createGrazingSessionRecord,
  pauseGrazingSessionRecord,
  resumeGrazingSessionRecord,
  stopGrazingSessionRecord,
  updateGrazingSessionAnimalCountRecord,
} from '@/lib/maps/grazing-session-actions'
import {
  clearRuntimeSessionState,
  getDefaultAnimalCount,
} from '@/components/maps/hooks/grazing-session-map-session-controller-helpers'
import { useGrazingSessionMapSessionRuntime } from '@/components/maps/hooks/use-grazing-session-map-session-runtime'
import { useGrazingSessionMapTrackpointRecorder } from '@/components/maps/hooks/use-grazing-session-map-trackpoint-recorder'
import { getSessionEventLabel } from '@/lib/maps/grazing-session-map-helpers'
import type { PositionData } from '@/components/maps/grazing-session-map-types'
import type {
  Animal,
  GrazingSession,
  Herd,
  SessionEventType,
  SessionStatus,
  TrackPoint,
} from '@/types/domain'

type UseGrazingSessionMapSessionControllerOptions = {
  activeSession: GrazingSession | null
  safeCurrentTrackpoints: TrackPoint[]
  safeHerds: Herd[]
  animalsByHerdId: Map<string, Animal[]>
  acceptedPositionRef: MutableRefObject<PositionData | null>
  selectedHerdId: string
  sessionAnimalCount: number | null
  sessionNotes: string
  setSelectedHerdId: Dispatch<SetStateAction<string>>
  setSessionAnimalCount: Dispatch<SetStateAction<number | null>>
  setSessionNotes: Dispatch<SetStateAction<string>>
  setCurrentSessionId: Dispatch<SetStateAction<string | null>>
  setCurrentSessionStatus: Dispatch<SetStateAction<SessionStatus | null>>
  setSelectedSessionId: Dispatch<SetStateAction<string | null>>
  setActionError: Dispatch<SetStateAction<string>>
  setIsSaving: Dispatch<SetStateAction<boolean>>
  setIsEventSaving: Dispatch<SetStateAction<boolean>>
  setEventNote: Dispatch<SetStateAction<string>>
  setEventStatus: Dispatch<SetStateAction<string>>
  setLiveDurationTick: Dispatch<SetStateAction<number>>
}

export function useGrazingSessionMapSessionController({
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
}: UseGrazingSessionMapSessionControllerOptions) {
  const runtimeRefs = useGrazingSessionMapSessionRuntime({
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
  })
  const { appendSessionPoint, handleAcceptedPositionRef } =
    useGrazingSessionMapTrackpointRecorder({
      runtimeRefs,
    })

  function getResolvedAnimalCount(herdId: string) {
    return sessionAnimalCount ?? getDefaultAnimalCount(herdId, safeHerds, animalsByHerdId)
  }

  function changeSelectedHerdId(nextHerdId: string) {
    setSelectedHerdId(nextHerdId)
    setSessionAnimalCount(
      nextHerdId ? getDefaultAnimalCount(nextHerdId, safeHerds, animalsByHerdId) : null
    )
    setActionError('')
  }

  async function startSession() {
    if (!selectedHerdId) {
      setActionError('Bitte zuerst eine Herde für den Weidegang auswählen.')
      return
    }

    if (activeSession) {
      setActionError('Es gibt bereits einen laufenden oder pausierten Weidegang.')
      return
    }

    setIsSaving(true)
    setActionError('')

    try {
      const animalCount = getResolvedAnimalCount(selectedHerdId)
      const session = await createGrazingSessionRecord({
        herdId: selectedHerdId,
        animalCount,
        notes: sessionNotes,
        position: acceptedPositionRef.current,
      })

      runtimeRefs.currentSessionIdRef.current = session.id
      runtimeRefs.currentSessionStatusRef.current = 'active'
      runtimeRefs.currentSessionStartTimeRef.current = session.startTime
      runtimeRefs.currentTrackpointsRef.current = []
      runtimeRefs.currentSeqRef.current = 0
      runtimeRefs.currentLastTimestampRef.current = null
      setCurrentSessionId(session.id)
      setCurrentSessionStatus('active')
      setSessionAnimalCount(animalCount)
      setSelectedSessionId(null)

      if (acceptedPositionRef.current) {
        await appendSessionPoint(acceptedPositionRef.current)
      }
    } catch {
      setActionError('Weidegang konnte nicht gestartet werden.')
    } finally {
      setIsSaving(false)
    }
  }

  async function pauseSession() {
    const sessionId = runtimeRefs.currentSessionIdRef.current
    const startTime = runtimeRefs.currentSessionStartTimeRef.current
    if (!sessionId || !startTime) return

    setIsSaving(true)
    setActionError('')

    try {
      await pauseGrazingSessionRecord({
        sessionId,
        startTime,
        trackpoints: runtimeRefs.currentTrackpointsRef.current,
        position: acceptedPositionRef.current,
      })

      runtimeRefs.currentSessionStatusRef.current = 'paused'
      setCurrentSessionStatus('paused')
    } catch {
      setActionError('Weidegang konnte nicht pausiert werden.')
    } finally {
      setIsSaving(false)
    }
  }

  async function resumeSession() {
    const sessionId = runtimeRefs.currentSessionIdRef.current
    if (!sessionId) return

    setIsSaving(true)
    setActionError('')

    try {
      await resumeGrazingSessionRecord({
        sessionId,
        position: acceptedPositionRef.current,
      })

      runtimeRefs.currentSessionStatusRef.current = 'active'
      setCurrentSessionStatus('active')

      if (acceptedPositionRef.current) {
        await appendSessionPoint(acceptedPositionRef.current)
      }
    } catch {
      setActionError('Weidegang konnte nicht fortgesetzt werden.')
    } finally {
      setIsSaving(false)
    }
  }

  async function stopSession() {
    const sessionId = runtimeRefs.currentSessionIdRef.current
    const startTime = runtimeRefs.currentSessionStartTimeRef.current
    if (!sessionId || !startTime) return

    setIsSaving(true)
    setActionError('')

    try {
      await stopGrazingSessionRecord({
        sessionId,
        startTime,
        trackpoints: runtimeRefs.currentTrackpointsRef.current,
        position: acceptedPositionRef.current,
      })

      setSelectedSessionId(sessionId)
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
        setSessionNotes,
      })
    } catch {
      setActionError('Weidegang konnte nicht beendet werden.')
    } finally {
      setIsSaving(false)
    }
  }

  async function adjustSessionAnimalCount(delta: number) {
    if (!selectedHerdId) return

    const currentAnimalCount = getResolvedAnimalCount(selectedHerdId)
    const nextAnimalCount = Math.max(0, currentAnimalCount + delta)

    if (nextAnimalCount === currentAnimalCount) {
      return
    }

    setSessionAnimalCount(nextAnimalCount)
    setActionError('')

    const sessionId = runtimeRefs.currentSessionIdRef.current
    if (!sessionId) return

    try {
      await updateGrazingSessionAnimalCountRecord({
        sessionId,
        animalCount: nextAnimalCount,
      })
    } catch {
      setSessionAnimalCount(currentAnimalCount)
      setActionError('Tierzahl konnte nicht aktualisiert werden.')
    }
  }

  async function addSessionMarkerEvent(type: SessionEventType, comment?: string) {
    const sessionId = runtimeRefs.currentSessionIdRef.current
    if (!sessionId) {
      setActionError('Es gibt keinen aktiven Weidegang für dieses Ereignis.')
      return
    }

    const cleanedComment = comment?.trim()
    if (type === 'note' && !cleanedComment) {
      setActionError('Bitte zuerst eine Notiz eingeben.')
      return
    }

    setIsEventSaving(true)
    setActionError('')
    setEventStatus('')

    try {
      await addGrazingSessionEventRecord({
        sessionId,
        type,
        position: acceptedPositionRef.current,
        comment: cleanedComment,
      })
      setEventStatus(`${getSessionEventLabel(type)} gespeichert.`)

      if (type === 'note') {
        setEventNote('')
      }
    } catch {
      setActionError('Ereignis konnte nicht gespeichert werden.')
    } finally {
      setIsEventSaving(false)
    }
  }

  return {
    handleAcceptedPositionRef,
    changeSelectedHerdId,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    adjustSessionAnimalCount,
    addSessionMarkerEvent,
  }
}
