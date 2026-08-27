'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
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

const ActiveRecordingContext = createContext<ActiveRecordingSnapshot | null>(null)

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
  const [nowMs, setNowMs] = useState(() => Date.now())
  const isActive = recording?.status === 'active'
  const startTime = recording?.startTime

  useEffect(() => {
    if (!isActive) return

    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [isActive, startTime])

  return createElement(ActiveRecordingContext.Provider, { value: { recording, nowMs } }, children)
}

export function useActiveRecordingSnapshot(): ActiveRecordingSnapshot {
  const snapshot = useContext(ActiveRecordingContext)
  if (!snapshot) {
    throw new Error('useActiveRecordingSnapshot must be used within ActiveRecordingProvider.')
  }

  return snapshot
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
