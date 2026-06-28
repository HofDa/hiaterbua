import type { MutableRefObject } from 'react'
import {
  addGrazingSessionEventRecord,
  createGrazingSessionRecord,
  pauseGrazingSessionRecord,
  resumeGrazingSessionRecord,
  stopGrazingSessionRecord,
  updateGrazingSessionAnimalCountRecord,
} from '@/lib/db/repositories/sessions'
import {
  clearRuntimeSessionState,
  getDefaultAnimalCount,
} from '@/components/maps/hooks/grazing-session-map-session-controller-helpers'
import { runSavingAction } from '@/components/maps/hooks/run-saving-action'
import { useGrazingSessionMapSessionRuntime } from '@/components/maps/hooks/use-grazing-session-map-session-runtime'
import { useGrazingSessionMapTrackpointRecorder } from '@/components/maps/hooks/use-grazing-session-map-trackpoint-recorder'
import { getSessionEventLabel } from '@/lib/maps/grazing-session-map-helpers'
import { getFreshPosition } from '@/lib/maps/map-core'
import { triggerHaptic } from '@/hooks/use-haptic-feedback'
import { getStorageEstimate } from '@/lib/utils/storage-health'
import type { GrazingSessionMapState } from '@/components/maps/hooks/use-grazing-session-map-state'
import type { PositionData } from '@/components/maps/grazing-session-map-types'
import type {
  Animal,
  GrazingSession,
  Herd,
  SessionEventType,
  TrackPoint,
} from '@/types/domain'

type UseGrazingSessionMapSessionControllerOptions = {
  activeSession: GrazingSession | null
  safeCurrentTrackpoints: TrackPoint[]
  safeHerds: Herd[]
  animalsByHerdId: Map<string, Animal[]>
  acceptedPositionRef: MutableRefObject<PositionData | null>
  selection: GrazingSessionMapState['selection']
  session: GrazingSessionMapState['session']
}

export function useGrazingSessionMapSessionController({
  activeSession,
  safeCurrentTrackpoints,
  safeHerds,
  animalsByHerdId,
  acceptedPositionRef,
  selection,
  session,
}: UseGrazingSessionMapSessionControllerOptions) {
  const {
    selectedHerdId,
    sessionAnimalCount,
    sessionNotes,
    setSelectedHerdId,
    setSessionAnimalCount,
    setSessionNotes,
    setCurrentSessionId,
    setCurrentSessionStatus,
    setActionError,
    setIsSaving,
    setIsEventSaving,
    setEventNote,
    setEventStatus,
    setLiveDurationTick,
  } = session
  const { setSelectedSessionId } = selection

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
      onRecordingErrorChange: setActionError,
    })

  async function warnIfStorageNearlyFull() {
    const estimate = await getStorageEstimate()
    if (estimate && estimate.ratio >= 0.9) {
      setActionError(
        `Gerätespeicher fast voll (${Math.round(estimate.ratio * 100)} %). Die Aufzeichnung könnte abbrechen – bitte Speicher freigeben.`
      )
    }
  }

  function getResolvedAnimalCount(herdId: string) {
    return sessionAnimalCount ?? getDefaultAnimalCount(herdId, safeHerds, animalsByHerdId)
  }

  function getFreshAcceptedPosition() {
    return getFreshPosition(acceptedPositionRef.current)
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

    await runSavingAction({
      setSaving: setIsSaving,
      savingValue: true,
      idleValue: false,
      setError: setActionError,
      errorMessage: 'Weidegang konnte nicht gestartet werden.',
      action: async () => {
        const currentPosition = getFreshAcceptedPosition()
        const animalCount = getResolvedAnimalCount(selectedHerdId)
        const session = await createGrazingSessionRecord({
          herdId: selectedHerdId,
          animalCount,
          notes: sessionNotes,
          position: currentPosition,
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

        // Glance-free confirmation that recording started — the user often has
        // the phone pocketed and gloves on at this moment.
        triggerHaptic('success')

        if (currentPosition) {
          await appendSessionPoint(currentPosition)
        }

        // Surface low device storage up front so the user can free space before
        // a long recording rather than discovering it mid-walk.
        void warnIfStorageNearlyFull()
      },
    })
  }

  async function pauseSession() {
    const sessionId = runtimeRefs.currentSessionIdRef.current
    const startTime = runtimeRefs.currentSessionStartTimeRef.current
    if (!sessionId || !startTime) return

    await runSavingAction({
      setSaving: setIsSaving,
      savingValue: true,
      idleValue: false,
      setError: setActionError,
      errorMessage: 'Weidegang konnte nicht pausiert werden.',
      action: async () => {
        await pauseGrazingSessionRecord({
          sessionId,
          startTime,
          trackpoints: runtimeRefs.currentTrackpointsRef.current,
          position: getFreshAcceptedPosition(),
        })

        runtimeRefs.currentSessionStatusRef.current = 'paused'
        setCurrentSessionStatus('paused')
        triggerHaptic('medium')
      },
    })
  }

  async function resumeSession() {
    const sessionId = runtimeRefs.currentSessionIdRef.current
    if (!sessionId) return

    await runSavingAction({
      setSaving: setIsSaving,
      savingValue: true,
      idleValue: false,
      setError: setActionError,
      errorMessage: 'Weidegang konnte nicht fortgesetzt werden.',
      action: async () => {
        const currentPosition = getFreshAcceptedPosition()
        await resumeGrazingSessionRecord({
          sessionId,
          position: currentPosition,
        })

        runtimeRefs.currentSessionStatusRef.current = 'active'
        setCurrentSessionStatus('active')
        triggerHaptic('medium')

        if (currentPosition) {
          await appendSessionPoint(currentPosition)
        }
      },
    })
  }

  async function stopSession() {
    const sessionId = runtimeRefs.currentSessionIdRef.current
    const startTime = runtimeRefs.currentSessionStartTimeRef.current
    if (!sessionId || !startTime) return

    await runSavingAction({
      setSaving: setIsSaving,
      savingValue: true,
      idleValue: false,
      setError: setActionError,
      errorMessage: 'Weidegang konnte nicht beendet werden.',
      action: async () => {
        await stopGrazingSessionRecord({
          sessionId,
          startTime,
          trackpoints: runtimeRefs.currentTrackpointsRef.current,
          position: getFreshAcceptedPosition(),
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
        triggerHaptic('success')
      },
    })
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

    setEventStatus('')

    await runSavingAction({
      setSaving: setIsEventSaving,
      savingValue: true,
      idleValue: false,
      setError: setActionError,
      errorMessage: 'Ereignis konnte nicht gespeichert werden.',
      action: async () => {
        const currentPosition = getFreshAcceptedPosition()
        await addGrazingSessionEventRecord({
          sessionId,
          type,
          position: currentPosition,
          comment: cleanedComment,
        })
        setEventStatus(
          currentPosition
            ? `${getSessionEventLabel(type)} gespeichert.`
            : `${getSessionEventLabel(type)} gespeichert (ohne aktuelle GPS-Position).`
        )

        if (type === 'note') {
          setEventNote('')
        }
      },
    })
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
