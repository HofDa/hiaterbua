import type { MutableRefObject } from 'react'
import {
  addGrazingSessionEventRecord,
  createGrazingSessionRecord,
  getGrazingSession,
  pauseGrazingSessionRecord,
  resumeGrazingSessionRecord,
  stopGrazingSessionRecord,
  undoStopGrazingSessionRecord,
  updateGrazingSessionAnimalCountRecord,
} from '@/lib/db/repositories/sessions'
import {
  clearRuntimeSessionState,
  getDefaultAnimalCount,
} from '@/components/maps/hooks/grazing-session-map-session-controller-helpers'
import { withSessionRecordingLock } from '@/lib/db/session-recording-lock'
import { OpenGrazingSessionExistsError } from '@/lib/domain/grazing-session-rules'
import { runSavingAction } from '@/components/maps/hooks/run-saving-action'
import { useGrazingSessionMapSessionRuntime } from '@/components/maps/hooks/use-grazing-session-map-session-runtime'
import { useGrazingSessionMapTrackpointRecorder } from '@/components/maps/hooks/use-grazing-session-map-trackpoint-recorder'
import {
  formatDistance,
  formatDurationWords,
  getDurationSeconds,
  getSessionEventLabel,
} from '@/lib/maps/grazing-session-map-helpers'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { nowIso } from '@/lib/utils/time'
import { getFreshPosition } from '@/lib/maps/map-core'
import { recordFieldDiagnostic } from '@/lib/diagnostics/field-diagnostics'
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
import { pluralize } from '@/lib/utils/format'

type UseGrazingSessionMapSessionControllerOptions = {
  activeSession: GrazingSession | null
  safeCurrentTrackpoints: TrackPoint[]
  safeHerds: Herd[]
  animalsByHerdId: Map<string, Animal[]>
  lastAnimalCountByHerdId: ReadonlyMap<string, number>
  acceptedPositionRef: MutableRefObject<PositionData | null>
  selection: GrazingSessionMapState['selection']
  session: GrazingSessionMapState['session']
}

export function useGrazingSessionMapSessionController({
  activeSession,
  safeCurrentTrackpoints,
  safeHerds,
  animalsByHerdId,
  lastAnimalCountByHerdId,
  acceptedPositionRef,
  selection,
  session,
}: UseGrazingSessionMapSessionControllerOptions) {
  const {
    setLastStoppedSession,
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
  } = session
  const { setSelectedSessionId } = selection
  const confirm = useConfirm()

  const runtimeRefs = useGrazingSessionMapSessionRuntime({
    activeSession,
    safeCurrentTrackpoints,
    safeHerds,
    animalsByHerdId,
    lastAnimalCountByHerdId,
    selectedHerdId,
    setSelectedHerdId,
    setSessionAnimalCount,
    setSessionNotes,
    setCurrentSessionId,
    setCurrentSessionStatus,
    setEventNote,
    setEventStatus,
  })
  const {
    appendSessionPoint,
    flushPendingPointsAssumingLock,
    suspendPositionIntake,
    resumePositionIntake,
    handleAcceptedPositionRef,
  } = useGrazingSessionMapTrackpointRecorder({
    runtimeRefs,
    onRecordingErrorChange: setActionError,
  })

  /**
   * Runs a lifecycle transition atomically with respect to GPS recording:
   * close the intake, take the session recording lock, flush everything still
   * queued, and only then persist the transition.
   *
   * If the flush fails the transition never runs, the intake reopens and the
   * queued points stay queued — a failed stop must never cost the user the last
   * stretch of a walk.
   */
  async function runRecordingTransition(
    sessionId: string,
    persistTransition: () => Promise<void>
  ) {
    suspendPositionIntake()

    try {
      await withSessionRecordingLock(sessionId, async () => {
        await flushPendingPointsAssumingLock()
        await persistTransition()
      })
    } catch (error) {
      resumePositionIntake()
      throw error
    }
  }

  async function warnIfStorageNearlyFull() {
    const estimate = await getStorageEstimate()
    if (estimate && estimate.ratio >= 0.9) {
      setActionError(
        `Gerätespeicher fast voll (${Math.round(estimate.ratio * 100)} %). Die Aufzeichnung könnte abbrechen – bitte Speicher freigeben.`
      )
    }
  }

  function getResolvedAnimalCount(herdId: string) {
    return sessionAnimalCount ?? getDefaultAnimalCount(herdId, safeHerds, animalsByHerdId, lastAnimalCountByHerdId)
  }

  function getFreshAcceptedPosition() {
    return getFreshPosition(acceptedPositionRef.current)
  }

  function changeSelectedHerdId(nextHerdId: string) {
    setSelectedHerdId(nextHerdId)
    setSessionAnimalCount(
      nextHerdId
        ? getDefaultAnimalCount(nextHerdId, safeHerds, animalsByHerdId, lastAnimalCountByHerdId)
        : null
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
      errorMessage: (error) =>
        error instanceof OpenGrazingSessionExistsError
          ? error.message
          : 'Weidegang konnte nicht gestartet werden.',
      action: async () => {
        const currentPosition = getFreshAcceptedPosition()
        const animalCount = getResolvedAnimalCount(selectedHerdId)
        const session = await createGrazingSessionRecord({
          herdId: selectedHerdId,
          animalCount,
          notes: sessionNotes,
          position: currentPosition,
        })
        recordFieldDiagnostic({
          type: 'grazing_session_started',
          message: 'Weidegang gestartet.',
          activeGrazingSessionId: session.id,
          activeRecordingId: session.id,
          details: { hasInitialPosition: Boolean(currentPosition) },
        })

        runtimeRefs.currentSessionIdRef.current = session.id
        runtimeRefs.currentSessionStatusRef.current = 'active'
        runtimeRefs.currentTrackpointsRef.current = []
        runtimeRefs.currentSeqRef.current = 0
        runtimeRefs.currentLastTimestampRef.current = null
        setCurrentSessionId(session.id)
        setCurrentSessionStatus('active')
        setSessionAnimalCount(animalCount)
        setSelectedSessionId(null)
        setLastStoppedSession(null)

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
    if (!sessionId) return

    await runSavingAction({
      setSaving: setIsSaving,
      savingValue: true,
      idleValue: false,
      setError: setActionError,
      errorMessage: 'Weidegang konnte nicht pausiert werden.',
      action: async () => {
        const position = getFreshAcceptedPosition()

        await runRecordingTransition(sessionId, async () => {
          await pauseGrazingSessionRecord({ sessionId, position })
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

        // Serialized through the same lock as appends and pause/stop, so a
        // resume can never interleave with a transition that is still flushing.
        await withSessionRecordingLock(sessionId, async () => {
          await resumeGrazingSessionRecord({
            sessionId,
            position: currentPosition,
          })
        })

        runtimeRefs.currentSessionStatusRef.current = 'active'
        setCurrentSessionStatus('active')
        resumePositionIntake()
        triggerHaptic('medium')

        if (currentPosition) {
          await appendSessionPoint(currentPosition)
        }
      },
    })
  }

  /** What the stop confirmation shows: herd · duration · distance · animals. */
  function describeSessionForStop() {
    if (!activeSession) return undefined

    const herdName = safeHerds.find((herd) => herd.id === activeSession.herdId)?.name
    const durationS =
      activeSession.status === 'active'
        ? getDurationSeconds(activeSession.startTime, nowIso())
        : activeSession.durationS
    return [
      herdName ?? 'Weidegang',
      formatDurationWords(durationS),
      formatDistance(activeSession.distanceM),
      activeSession.animalCount != null ? pluralize(activeSession.animalCount, 'Tier', 'Tiere') : null,
    ]
      .filter(Boolean)
      .join(' · ')
  }

  async function stopSession() {
    const sessionId = runtimeRefs.currentSessionIdRef.current
    if (!sessionId) return

    // Ending a recording is final, and the Stop button sits within thumb reach
    // of Pause — a pocket tap or a glove slip must not end the track.
    const summary = describeSessionForStop()
    const confirmed = await confirm({
      title: 'Weidegang beenden?',
      description: summary
        ? `${summary}. Die GPS-Aufzeichnung wird abgeschlossen und gespeichert.`
        : 'Die GPS-Aufzeichnung wird abgeschlossen und gespeichert.',
      confirmLabel: 'Beenden',
      cancelLabel: 'Weiter aufzeichnen',
      destructive: true,
    })
    if (!confirmed || runtimeRefs.currentSessionIdRef.current !== sessionId) return

    await runSavingAction({
      setSaving: setIsSaving,
      savingValue: true,
      idleValue: false,
      setError: setActionError,
      errorMessage: 'Weidegang konnte nicht beendet werden.',
      action: async () => {
        const position = getFreshAcceptedPosition()

        await runRecordingTransition(sessionId, async () => {
          await stopGrazingSessionRecord({ sessionId, position })
        })

        recordFieldDiagnostic({
          type: 'grazing_session_stopped',
          message: 'Weidegang beendet.',
          activeGrazingSessionId: sessionId,
          activeRecordingId: sessionId,
          details: { trackpointCount: runtimeRefs.currentTrackpointsRef.current.length },
        })

        // Closure for the walk: what was saved, with a short window to undo a
        // mistaken stop.
        const stopped = await getGrazingSession(sessionId)
        if (stopped?.endTime) {
          setLastStoppedSession({
            sessionId,
            stoppedAt: stopped.endTime,
            herdName: safeHerds.find((herd) => herd.id === stopped.herdId)?.name ?? 'Weidegang',
            durationS: stopped.durationS,
            distanceM: stopped.distanceM,
            animalCount: stopped.animalCount ?? null,
          })
        }

        // Runtime state is cleared only now — after the flush and the stop
        // transaction both succeeded.
        setSelectedSessionId(sessionId)
        clearRuntimeSessionState({
          runtimeRefs,
          selectedHerdId,
          safeHerds,
          animalsByHerdId,
          lastAnimalCountByHerdId,
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

  /** Reopens the session stopped moments ago ("Rückgängig"). */
  async function undoStop() {
    const lastStopped = session.lastStoppedSession
    if (!lastStopped) return

    await runSavingAction({
      setSaving: setIsSaving,
      savingValue: true,
      idleValue: false,
      setError: setActionError,
      errorMessage: (error) =>
        error instanceof Error && error.message
          ? error.message
          : 'Weidegang konnte nicht fortgesetzt werden.',
      action: async () => {
        await withSessionRecordingLock(lastStopped.sessionId, () =>
          undoStopGrazingSessionRecord({
            sessionId: lastStopped.sessionId,
            stoppedAt: lastStopped.stoppedAt,
          })
        )
        recordFieldDiagnostic({
          type: 'grazing_session_stop_undone',
          message: 'Beenden rückgängig gemacht – Weidegang läuft weiter.',
          activeGrazingSessionId: lastStopped.sessionId,
          activeRecordingId: lastStopped.sessionId,
        })
        setLastStoppedSession(null)
        setSelectedSessionId(null)
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
    undoStop,
    dismissStopSummary: () => setLastStoppedSession(null),
    adjustSessionAnimalCount,
    addSessionMarkerEvent,
  }
}
