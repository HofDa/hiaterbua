'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/dexie'
import { selectActiveRecordingSource } from '@/lib/recordings/active-recording-selection'
import { getLiveDurationS } from '@/lib/work/work-session-formatting'
import { getWorkLabel } from '@/lib/work/work-session-helpers'

export type ActiveRecording = {
  kind: 'grazing' | 'work'
  href: string
  label: string
  status: 'active' | 'paused'
  /** Live distance, grazing only. */
  distanceM: number | null
  // Inputs for the kind-specific elapsed calculation: grazing duration is
  // wall-clock from startTime (matching buildSessionMetrics), while work
  // duration is banked and accrues from activeSince (null while paused),
  // matching getLiveDurationS.
  startTime: string
  durationS: number
  activeSince: string | null
}

/** The one recording the user most needs to see; undefined while loading. */
export function useActiveRecording(): ActiveRecording | null | undefined {
  return useLiveQuery<ActiveRecording | null>(async () => {
    const [grazingSessions, workSessions] = await Promise.all([
      db.sessions.where('status').anyOf('active', 'paused').toArray(),
      db.workSessions.where('status').anyOf('active', 'paused').toArray(),
    ])

    const source = selectActiveRecordingSource(grazingSessions, workSessions)
    if (!source) return null

    if (source.kind === 'grazing') {
      const grazing = source.recording
      const herd = grazing.herdId ? await db.herds.get(grazing.herdId) : undefined
      return {
        kind: 'grazing',
        href: '/sessions',
        label: herd?.name ? `Weidegang · ${herd.name}` : 'Weidegang',
        status: grazing.status as ActiveRecording['status'],
        distanceM: grazing.distanceM ?? 0,
        startTime: grazing.startTime,
        durationS: grazing.durationS ?? 0,
        activeSince: null,
      }
    }

    const work = source.recording
    return {
      kind: 'work',
      href: '/work',
      label: getWorkLabel(work),
      status: work.status as ActiveRecording['status'],
      distanceM: null,
      startTime: work.startTime,
      durationS: work.durationS ?? 0,
      activeSince: work.activeSince ?? null,
    }
  }, [])
}

/**
 * Elapsed seconds for a recording at `nowMs`. Work duration is banked
 * (excludes paused time) and accrues from activeSince; grazing duration is
 * wall-clock from start while active, frozen at the stored duration while
 * paused. Using the wrong model would over-count a resumed work session.
 */
export function getRecordingElapsedS(recording: ActiveRecording, nowMs: number): number {
  if (recording.kind === 'work') return getLiveDurationS(recording, nowMs)

  return recording.status === 'active'
    ? Math.max(0, (nowMs - Date.parse(recording.startTime)) / 1000)
    : recording.durationS
}
