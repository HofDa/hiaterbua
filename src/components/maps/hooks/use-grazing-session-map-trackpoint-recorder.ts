import { useRef } from 'react'
import { appendSessionTrackpoint } from '@/lib/maps/grazing-session-actions'
import { useLatestValueRef } from '@/components/maps/hooks/use-latest-value-ref'
import { isQuotaExceededError } from '@/lib/utils/storage-health'
import type { PositionData } from '@/components/maps/grazing-session-map-types'
import type { GrazingSessionRuntimeRefs } from '@/components/maps/hooks/grazing-session-map-session-controller-helpers'
import { nowIso } from '@/lib/utils/time'

type UseGrazingSessionMapTrackpointRecorderOptions = {
  runtimeRefs: GrazingSessionRuntimeRefs
  onRecordingErrorChange?: (message: string) => void
}

function buildRecordingErrorMessage(error: unknown, pendingCount: number) {
  if (isQuotaExceededError(error)) {
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
    currentSessionStartTimeRef,
    currentTrackpointsRef,
    currentSeqRef,
    currentLastTimestampRef,
  } = runtimeRefs

  const pendingPositionsRef = useRef<PositionData[]>([])
  const isFlushingRef = useRef(false)
  const lastReportedErrorRef = useRef('')

  function reportRecordingError(message: string) {
    // Only push a change when the recording health actually transitions, so a
    // healthy stream of points never clobbers unrelated action errors, and a
    // persistent failure isn't re-announced on every GPS fix.
    if (message === lastReportedErrorRef.current) return
    lastReportedErrorRef.current = message
    onRecordingErrorChange?.(message)
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
            nextSeq: currentSeqRef.current + 1,
            nextPosition,
            currentTrackpoints: currentTrackpointsRef.current,
            startTime: currentSessionStartTimeRef.current ?? nowIso(),
          })

          // Persisted (or skipped as a duplicate); remove it from the queue.
          pendingPositionsRef.current.shift()

          if (result) {
            currentTrackpointsRef.current = result.nextTrackpoints
            currentSeqRef.current = result.nextSeq
            currentLastTimestampRef.current = result.lastTimestamp
          }

          reportRecordingError('')
        } catch (error) {
          // Keep the point queued and retry on the next accepted position so a
          // transient write failure doesn't punch a hole in the recorded track.
          reportRecordingError(
            buildRecordingErrorMessage(error, pendingPositionsRef.current.length)
          )
          break
        }
      }
    } finally {
      isFlushingRef.current = false
    }
  }

  async function appendSessionPoint(nextPosition: PositionData) {
    if (!currentSessionIdRef.current) return
    pendingPositionsRef.current.push(nextPosition)
    await persistPendingPositions()
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
