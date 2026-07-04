import { useEffect, useRef } from 'react'
import { appendSessionTrackpoint } from '@/lib/db/repositories/sessions'
import { useLatestValueRef } from '@/components/maps/hooks/use-latest-value-ref'
import { triggerHaptic } from '@/hooks/use-haptic-feedback'
import { isQuotaExceededError } from '@/lib/utils/storage-health'
import type { PositionData } from '@/components/maps/grazing-session-map-types'
import type { GrazingSessionRuntimeRefs } from '@/components/maps/hooks/grazing-session-map-session-controller-helpers'
import { nowIso } from '@/lib/utils/time'

type UseGrazingSessionMapTrackpointRecorderOptions = {
  runtimeRefs: GrazingSessionRuntimeRefs
  onRecordingErrorChange?: (message: string) => void
}

// A stable category for the failure, independent of the (changing) pending
// count — so dedupe keys on the kind, not on the count-bearing display string.
type RecordingErrorKind = 'quota' | 'write' | null
type LockManagerLike = {
  request<T>(
    name: string,
    options: { mode: 'exclusive' },
    callback: () => T | Promise<T>
  ): Promise<T>
}

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

function getRecordingLockManager() {
  if (typeof navigator === 'undefined') return null
  return (navigator as Navigator & { locks?: LockManagerLike }).locks ?? null
}

export function useGrazingSessionMapTrackpointRecorder({
  runtimeRefs,
  onRecordingErrorChange,
}: UseGrazingSessionMapTrackpointRecorderOptions) {
  const {
    currentSessionIdRef,
    currentSessionStatusRef,
    currentSessionStartTimeRef,
    currentTrackpointsRef,
    currentSeqRef,
    currentLastTimestampRef,
  } = runtimeRefs

  const pendingPositionsRef = useRef<PositionData[]>([])
  const isFlushingRef = useRef(false)
  const lastErrorKindRef = useRef<RecordingErrorKind>(null)

  function reportRecordingError(kind: RecordingErrorKind, message: string) {
    const kindChanged = kind !== lastErrorKindRef.current
    lastErrorKindRef.current = kind

    // Buzz only when the failure first appears (or changes category) — not on
    // every retry — so a persistent error doesn't spam a haptic on each GPS fix.
    // The user is likely not watching the screen when recording silently fails.
    if (kind && kindChanged) triggerHaptic('error')

    // Keep the displayed message current (its pending count grows) while the
    // failure persists, but stay quiet once recording is healthy again.
    if (kind || kindChanged) onRecordingErrorChange?.(message)
  }

  async function persistPendingPositions() {
    if (isFlushingRef.current) return
    isFlushingRef.current = true

    try {
      while (pendingPositionsRef.current.length > 0) {
        const sessionId = currentSessionIdRef.current
        if (!sessionId) {
          // The session ended; drop any positions still queued for it.
          pendingPositionsRef.current = []
          break
        }

        const nextPosition = pendingPositionsRef.current[0]

        try {
          const result = await appendSessionTrackpoint({
            sessionId,
            lastTimestamp: currentLastTimestampRef.current,
            nextPosition,
            startTime: currentSessionStartTimeRef.current ?? nowIso(),
          })

          // Persisted (or skipped as a duplicate); remove it from the queue.
          pendingPositionsRef.current.shift()

          if (result) {
            currentTrackpointsRef.current.push(result.trackPoint)
            currentSeqRef.current = result.nextSeq
            currentLastTimestampRef.current = result.lastTimestamp
          }

          reportRecordingError(null, '')
        } catch (error) {
          // Keep the point queued and retry on the next accepted position so a
          // transient write failure doesn't punch a hole in the recorded track.
          const kind = getRecordingErrorKind(error)
          reportRecordingError(
            kind,
            buildRecordingErrorMessage(kind, pendingPositionsRef.current.length)
          )
          break
        }
      }
    } finally {
      isFlushingRef.current = false
    }
  }

  async function flushPendingPositionsWithLock() {
    const sessionId = currentSessionIdRef.current
    const locks = getRecordingLockManager()
    if (!sessionId || !locks) {
      await persistPendingPositions()
      return
    }

    await locks.request(
      `pastore:grazing-session:${sessionId}:recording`,
      { mode: 'exclusive' },
      () => persistPendingPositions()
    )
  }

  const flushPendingPositionsWithLockRef = useLatestValueRef(flushPendingPositionsWithLock)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (pendingPositionsRef.current.length > 0) {
        void flushPendingPositionsWithLockRef.current()
      }
    }, RECORDING_RETRY_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [flushPendingPositionsWithLockRef])

  async function appendSessionPoint(nextPosition: PositionData) {
    if (!currentSessionIdRef.current) return
    pendingPositionsRef.current.push(nextPosition)
    await flushPendingPositionsWithLock()
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
    handleAcceptedPositionRef,
  }
}
