import { useEffect, useRef } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import {
  addGrazingSessionEventRecord,
  appendSessionTrackpoint,
  createGrazingSessionRecord,
  pauseGrazingSessionRecord,
  resumeGrazingSessionRecord,
  stopGrazingSessionRecord,
  updateGrazingSessionAnimalCountRecord,
} from '@/lib/maps/grazing-session-actions'
import { getSessionEventLabel } from '@/lib/maps/grazing-session-map-helpers'
import { getEffectiveHerdCount } from '@/lib/maps/live-position-map-helpers'
import { useLatestValueRef } from '@/components/maps/hooks/use-latest-value-ref'
import type { PositionData } from '@/components/maps/grazing-session-map-types'
import { nowIso } from '@/lib/utils/time'
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

function getDefaultAnimalCount(
  herdId: string,
  safeHerds: Herd[],
  animalsByHerdId: Map<string, Animal[]>
) {
  if (!herdId) return 0

  const herd = safeHerds.find((currentHerd) => currentHerd.id === herdId)
  return Math.max(0, getEffectiveHerdCount(herd, animalsByHerdId.get(herdId) ?? []) ?? 0)
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
  const currentSessionIdRef = useRef<string | null>(null)
  const currentSessionStatusRef = useRef<SessionStatus | null>(null)
  const currentSessionStartTimeRef = useRef<string | null>(null)
  const currentTrackpointsRef = useRef<TrackPoint[]>([])
  const currentSeqRef = useRef(0)
  const currentLastTimestampRef = useRef<number | null>(null)
  const appendSessionPointRef = useRef<(nextPosition: PositionData) => Promise<void>>(async () => {})

  function getResolvedAnimalCount(herdId: string) {
    return sessionAnimalCount ?? getDefaultAnimalCount(herdId, safeHerds, animalsByHerdId)
  }

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
    currentTrackpointsRef.current = safeCurrentTrackpoints
    currentSeqRef.current =
      safeCurrentTrackpoints.length > 0
        ? safeCurrentTrackpoints[safeCurrentTrackpoints.length - 1].seq
        : 0
    currentLastTimestampRef.current =
      safeCurrentTrackpoints.length > 0
        ? new Date(safeCurrentTrackpoints[safeCurrentTrackpoints.length - 1].timestamp).getTime()
        : null
  }, [safeCurrentTrackpoints])

  useEffect(() => {
    if (!activeSession) return

    currentSessionIdRef.current = activeSession.id
    currentSessionStatusRef.current = activeSession.status
    currentSessionStartTimeRef.current = activeSession.startTime
    setCurrentSessionId(activeSession.id)
    setCurrentSessionStatus(activeSession.status)
    setSelectedHerdId(activeSession.herdId)
    setSessionAnimalCount(
      activeSession.animalCount ??
        getDefaultAnimalCount(activeSession.herdId, safeHerds, animalsByHerdId)
    )
    setSessionNotes(activeSession.notes ?? '')
  }, [
    activeSession,
    animalsByHerdId,
    safeHerds,
    setCurrentSessionId,
    setCurrentSessionStatus,
    setSelectedHerdId,
    setSessionAnimalCount,
    setSessionNotes,
  ])

  useEffect(() => {
    if (activeSession) return
    if (currentSessionStatusRef.current === null && currentSessionIdRef.current === null) return

    currentSessionIdRef.current = null
    currentSessionStatusRef.current = null
    currentSessionStartTimeRef.current = null
    currentSeqRef.current = 0
    currentLastTimestampRef.current = null
    setCurrentSessionId(null)
    setCurrentSessionStatus(null)
    setSessionAnimalCount(
      selectedHerdId ? getDefaultAnimalCount(selectedHerdId, safeHerds, animalsByHerdId) : null
    )
    setEventNote('')
    setEventStatus('')
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
  ])

  async function appendSessionPoint(nextPosition: PositionData) {
    const sessionId = currentSessionIdRef.current
    if (!sessionId) return

    const result = await appendSessionTrackpoint({
      sessionId,
      lastTimestamp: currentLastTimestampRef.current,
      nextSeq: currentSeqRef.current + 1,
      nextPosition,
      currentTrackpoints: currentTrackpointsRef.current,
      startTime: currentSessionStartTimeRef.current ?? nowIso(),
    })

    if (!result) {
      return
    }

    currentTrackpointsRef.current = result.nextTrackpoints
    currentSeqRef.current = result.nextSeq
    currentLastTimestampRef.current = result.lastTimestamp
  }

  appendSessionPointRef.current = appendSessionPoint

  const handleAcceptedPositionRef = useLatestValueRef<((next: PositionData) => void) | null>(
    (next) => {
      if (currentSessionStatusRef.current === 'active') {
        void appendSessionPointRef.current(next)
      }
    }
  )

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

      currentSessionIdRef.current = session.id
      currentSessionStatusRef.current = 'active'
      currentSessionStartTimeRef.current = session.startTime
      currentTrackpointsRef.current = []
      currentSeqRef.current = 0
      currentLastTimestampRef.current = null
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
    const sessionId = currentSessionIdRef.current
    const startTime = currentSessionStartTimeRef.current
    if (!sessionId || !startTime) return

    setIsSaving(true)
    setActionError('')

    try {
      await pauseGrazingSessionRecord({
        sessionId,
        startTime,
        trackpoints: currentTrackpointsRef.current,
        position: acceptedPositionRef.current,
      })

      currentSessionStatusRef.current = 'paused'
      setCurrentSessionStatus('paused')
    } catch {
      setActionError('Weidegang konnte nicht pausiert werden.')
    } finally {
      setIsSaving(false)
    }
  }

  async function resumeSession() {
    const sessionId = currentSessionIdRef.current
    if (!sessionId) return

    setIsSaving(true)
    setActionError('')

    try {
      await resumeGrazingSessionRecord({
        sessionId,
        position: acceptedPositionRef.current,
      })

      currentSessionStatusRef.current = 'active'
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
    const sessionId = currentSessionIdRef.current
    const startTime = currentSessionStartTimeRef.current
    if (!sessionId || !startTime) return

    setIsSaving(true)
    setActionError('')

    try {
      await stopGrazingSessionRecord({
        sessionId,
        startTime,
        trackpoints: currentTrackpointsRef.current,
        position: acceptedPositionRef.current,
      })

      setSelectedSessionId(sessionId)
      currentSessionIdRef.current = null
      currentSessionStatusRef.current = null
      currentSessionStartTimeRef.current = null
      currentTrackpointsRef.current = []
      currentSeqRef.current = 0
      currentLastTimestampRef.current = null
      setCurrentSessionId(null)
      setCurrentSessionStatus(null)
      setSessionAnimalCount(
        selectedHerdId ? getDefaultAnimalCount(selectedHerdId, safeHerds, animalsByHerdId) : null
      )
      setSessionNotes('')
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

    const sessionId = currentSessionIdRef.current
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
    const sessionId = currentSessionIdRef.current
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
