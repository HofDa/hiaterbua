'use client'

import { useNowTick } from '@/hooks/use-now-tick'
import { formatDuration, getDurationSeconds } from '@/lib/maps/grazing-session-map-helpers'

/**
 * Seconds a grazing session has been running. While `runningSince` is set it
 * counts wall-clock time from that start (matching how an active session's
 * duration is defined); otherwise it shows the stored `fallbackS`.
 */
export function useLiveDurationS(runningSince: string | null, fallbackS: number): number {
  const nowMs = useNowTick(runningSince !== null)
  return runningSince !== null
    ? getDurationSeconds(runningSince, new Date(nowMs).toISOString())
    : fallbackS
}

/** Self-ticking duration label, so the screen around it does not re-render every second. */
export function LiveDuration({
  runningSince,
  fallbackS,
}: {
  runningSince: string | null
  fallbackS: number
}) {
  return <>{formatDuration(useLiveDurationS(runningSince, fallbackS))}</>
}
