'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { createContext, createElement, useContext, type ReactNode } from 'react'
import { useNowTick } from '@/hooks/use-now-tick'
import { getHerd } from '@/lib/db/repositories/herds'
import { listUnfinishedSessions } from '@/lib/db/repositories/sessions'
import { listUnfinishedWorkSessions } from '@/lib/db/repositories/work-sessions'
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

type ActiveRecordingSnapshot = {
  recording: ActiveRecording | null | undefined
  nowMs: number
}

// Holds only the recording (undefined while loading). The per-second clock is
// not in the context: it ticks in each consumer via useNowTick, so a running
// timer re-renders the labels that show it, not every consumer of the context.
const ActiveRecordingContext = createContext<{ recording: ActiveRecording | null | undefined } | null>(
  null
)

function useActiveRecordingQuery(): ActiveRecording | null | undefined {
  return useLiveQuery<ActiveRecording | null>(async () => {
    const [grazingSessions, workSessions] = await Promise.all([
      listUnfinishedSessions(),
      listUnfinishedWorkSessions(),
    ])

    const source = selectActiveRecordingSource(grazingSessions, workSessions)
    if (!source) return null

    if (source.kind === 'grazing') {
      const grazing = source.recording
      const herd = grazing.herdId ? await getHerd(grazing.herdId) : undefined
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

export function ActiveRecordingProvider({ children }: { children: ReactNode }) {
  const recording = useActiveRecordingQuery()
  return createElement(ActiveRecordingContext.Provider, { value: { recording } }, children)
}

/** The current recording, without a running clock. */
export function useActiveRecording(): ActiveRecording | null | undefined {
  const value = useContext(ActiveRecordingContext)
  if (!value) {
    throw new Error('useActiveRecording must be used within ActiveRecordingProvider.')
  }

  return value.recording
}

/** The current recording plus a clock that ticks every second while it is active. */
export function useActiveRecordingSnapshot(): ActiveRecordingSnapshot {
  const recording = useActiveRecording()
  const nowMs = useNowTick(recording?.status === 'active')
  return { recording, nowMs }
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
