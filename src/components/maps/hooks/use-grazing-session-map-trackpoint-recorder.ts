import { useEffect, useRef, useState } from 'react'
import { appendSessionTrackpoint } from '@/lib/db/repositories/sessions'
import { withSessionRecordingLock } from '@/lib/db/session-recording-lock'
import {
  createTrackpointQueue,
  type TrackpointQueueDeps,
} from '@/lib/maps/grazing-trackpoint-queue'
import { useLatestValueRef } from '@/components/maps/hooks/use-latest-value-ref'
import { recordFieldDiagnostic } from '@/lib/diagnostics/field-diagnostics'
import { triggerHaptic } from '@/hooks/use-haptic-feedback'
import { isQuotaExceededError } from '@/lib/utils/storage-health'
import type { PositionData } from '@/components/maps/grazing-session-map-types'
import type { GrazingSessionRuntimeRefs } from '@/components/maps/hooks/grazing-session-map-session-controller-helpers'

type UseGrazingSessionMapTrackpointRecorderOptions = {
  runtimeRefs: GrazingSessionRuntimeRefs
  onRecordingErrorChange?: (message: string) => void
}

// A stable category for the failure, independent of the (changing) pending
// count — so dedupe keys on the kind, not on the count-bearing display string.
type RecordingErrorKind = 'quota' | 'write' | null

const RECORDING_RETRY_INTERVAL_MS = 5_000

function getRecordingErrorKind(error: unknown): RecordingErrorKind {
  return isQuotaExceededError(error) ? 'quota' : 'write'
}

function buildRecordingErrorMessage(kind: RecordingErrorKind, pendingCount: number) {
  if (kind === 'quota') {
    return 'Speicher voll – Trackpunkte können nicht gespeichert werden. Bitte Speicher freigeben (z. B. Tile-Cache leeren).'
  }

  return `Trackpunkt konnte nicht gespeichert werden (${pendingCount} ausstehend). Wird automatisch erneut versucht.`
}

export function useGrazingSessionMapTrackpointRecorder({
  runtimeRefs,
  onRecordingErrorChange,
}: UseGrazingSessionMapTrackpointRecorderOptions) {
  const {
    currentSessionIdRef,
    currentSessionStatusRef,
    currentTrackpointsRef,
    currentSeqRef,
    currentLastTimestampRef,
  } = runtimeRefs

  const lastErrorKindRef = useRef<RecordingErrorKind>(null)
  const onRecordingErrorChangeRef = useLatestValueRef(onRecordingErrorChange)

  function reportRecordingError(kind: RecordingErrorKind, message: string) {
    const kindChanged = kind !== lastErrorKindRef.current
    lastErrorKindRef.current = kind

    // Buzz only when the failure first appears (or changes category) — not on
    // every retry — so a persistent error doesn't spam a haptic on each GPS fix.
    // The user is likely not watching the screen when recording silently fails.
    if (kind && kindChanged) triggerHaptic('error')

    // Keep the displayed message current (its pending count grows) while the
    // failure persists, but stay quiet once recording is healthy again.
    if (kind || kindChanged) onRecordingErrorChangeRef.current?.(message)
  }

  const reportRecordingErrorRef = useLatestValueRef(reportRecordingError)

  // Created once and kept for the lifetime of the screen: the queue owns
  // in-flight GPS points, so re-creating it would drop them.
  const [queue] = useState(createTrackpointQueue)

  /**
   * Built per call rather than captured once, so the queue never holds a ref
   * across a render.
   */
  function getQueueDeps(): TrackpointQueueDeps {
    return {
      appendTrackpoint: appendSessionTrackpoint,
      withLock: withSessionRecordingLock,
      getLastTimestamp: () => currentLastTimestampRef.current,
      onPersisted: (pending, result) => {
        // Only mirror into the runtime refs while this is still the session on
        // screen — a late point for a previous session must not rewrite them.
        if (pending.sessionId !== currentSessionIdRef.current) return

        currentTrackpointsRef.current.push(result.trackPoint)
        currentSeqRef.current = result.nextSeq
        currentLastTimestampRef.current = result.lastTimestamp
      },
      onHealthy: () => reportRecordingErrorRef.current(null, ''),
      onWriteFailed: (pending, error, pendingCount) => {
        const kind = getRecordingErrorKind(error)
        recordFieldDiagnostic({
          type: 'indexeddb_write_failed',
          level: 'error',
          message: 'Weidegang-Trackpunkt konnte lokal nicht gespeichert werden.',
          activeGrazingSessionId: pending.sessionId,
          activeRecordingId: pending.sessionId,
          details: { kind, error },
        })
        reportRecordingErrorRef.current(kind, buildRecordingErrorMessage(kind, pendingCount))
      },
      onRejected: (pending, error) => {
        recordFieldDiagnostic({
          type: 'grazing_trackpoint_rejected',
          level: 'error',
          message: 'Trackpunkt verworfen: Der Weidegang zeichnet nicht mehr auf.',
          activeGrazingSessionId: error.sessionId,
          activeRecordingId: error.sessionId,
          details: { status: error.status, timestamp: pending.position.timestamp },
        })
        reportRecordingErrorRef.current(
          'write',
          'Ein GPS-Punkt konnte nicht gespeichert werden: Der Weidegang zeichnet nicht mehr auf.'
        )
      },
    }
  }

  const getQueueDepsRef = useLatestValueRef(getQueueDeps)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (queue.size() > 0) {
        void queue.flush(currentSessionIdRef.current, getQueueDepsRef.current())
      }
    }, RECORDING_RETRY_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [queue, currentSessionIdRef, getQueueDepsRef])

  async function appendSessionPoint(nextPosition: PositionData) {
    const sessionId = currentSessionIdRef.current
    if (!sessionId) return

    // Returns false when a pause/stop is in flight: its flush has already
    // snapshotted the queue, so a fix accepted now must not slip in behind it.
    if (!queue.enqueue(sessionId, nextPosition)) return

    await queue.flush(sessionId, getQueueDeps())
  }

  const appendSessionPointRef = useLatestValueRef(appendSessionPoint)

  const handleAcceptedPositionRef = useLatestValueRef<((next: PositionData) => void) | null>(
    (next) => {
      if (currentSessionStatusRef.current === 'active') {
        void appendSessionPointRef.current(next)
      }
    }
  )

  return {
    appendSessionPoint,
    /** Drains the queue for a caller already holding the recording lock. */
    flushPendingPointsAssumingLock: () => queue.flushAssumingLock(getQueueDeps()),
    suspendPositionIntake: () => queue.suspendIntake(),
    resumePositionIntake: () => queue.resumeIntake(),
    handleAcceptedPositionRef,
  }
}
