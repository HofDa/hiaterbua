import { appendSessionTrackpoint } from '@/lib/maps/grazing-session-actions'
import { useLatestValueRef } from '@/components/maps/hooks/use-latest-value-ref'
import type { PositionData } from '@/components/maps/grazing-session-map-types'
import type { GrazingSessionRuntimeRefs } from '@/components/maps/hooks/grazing-session-map-session-controller-helpers'
import { nowIso } from '@/lib/utils/time'

type UseGrazingSessionMapTrackpointRecorderOptions = {
  runtimeRefs: GrazingSessionRuntimeRefs
}

export function useGrazingSessionMapTrackpointRecorder({
  runtimeRefs,
}: UseGrazingSessionMapTrackpointRecorderOptions) {
  const {
    currentSessionIdRef,
    currentSessionStatusRef,
    currentSessionStartTimeRef,
    currentTrackpointsRef,
    currentSeqRef,
    currentLastTimestampRef,
  } = runtimeRefs

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
