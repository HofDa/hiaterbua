'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, CircleDot, Pause } from 'lucide-react'
import { db } from '@/lib/db/dexie'
import { formatDistance, formatDuration } from '@/lib/maps/grazing-session-map-helpers'
import { getWorkLabel } from '@/lib/work/work-session-helpers'
import { getLiveDurationS } from '@/lib/work/work-session-formatting'
import { triggerHaptic } from '@/hooks/use-haptic-feedback'
import { cn } from '@/lib/utils/cn'
import type { GrazingSession } from '@/types/domain'

// Fixed height of the bar. Published to `--app-recording-bar-height` so page
// content and bottom-fixed banners reserve matching space; kept in one place so
// the visual height and the reserved offset can't drift apart.
const RECORDING_BAR_HEIGHT = '3.25rem'

type ActiveRecording = {
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

// Active before paused, then most recently started first.
function pickCurrent<T extends { status: GrazingSession['status']; startTime: string }>(
  rows: T[],
): T | null {
  return (
    [...rows].sort((left, right) => {
      if (left.status !== right.status) return left.status === 'active' ? -1 : 1
      return right.startTime.localeCompare(left.startTime)
    })[0] ?? null
  )
}

export function RecordingStatusBar() {
  const recording = useLiveQuery<ActiveRecording | null>(async () => {
    const [grazingSessions, workSessions] = await Promise.all([
      db.sessions.where('status').anyOf('active', 'paused').toArray(),
      db.workSessions.where('status').anyOf('active', 'paused').toArray(),
    ])

    // Prefer the grazing session: it is the GPS- and battery-critical recording
    // the user most needs to keep an eye on.
    const grazing = pickCurrent(grazingSessions)
    if (grazing) {
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

    const work = pickCurrent(workSessions)
    if (work) {
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
    }

    return null
  }, [])

  const [nowMs, setNowMs] = useState(() => Date.now())
  const isRecording = recording != null
  const isActive = recording?.status === 'active'
  const startTime = recording?.startTime

  // Tick once a second only while actively recording; paused sessions show a
  // frozen duration, so there is nothing to update.
  useEffect(() => {
    if (!isActive) return
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [isActive, startTime])

  // Reserve space above the bottom nav so fixed banners and page content clear
  // the bar (see the --app-recording-bar-height consumers).
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty(
      '--app-recording-bar-height',
      isRecording ? RECORDING_BAR_HEIGHT : '0rem',
    )
    return () => {
      root.style.setProperty('--app-recording-bar-height', '0rem')
    }
  }, [isRecording])

  if (!recording) return null

  // Work duration is banked (excludes paused time); grazing duration is
  // wall-clock from start while active, frozen at the stored duration while
  // paused. Using the wrong model would over-count a resumed work session.
  const elapsedS =
    recording.kind === 'work'
      ? getLiveDurationS(recording, nowMs)
      : recording.status === 'active'
        ? Math.max(0, (nowMs - Date.parse(recording.startTime)) / 1000)
        : recording.durationS

  const metrics =
    recording.distanceM !== null
      ? `${formatDuration(elapsedS)} · ${formatDistance(recording.distanceM)}`
      : formatDuration(elapsedS)

  return (
    <Link
      href={recording.href}
      onClick={() => triggerHaptic('light')}
      aria-label={`Laufende ${recording.kind === 'grazing' ? 'Weidegang' : 'Arbeits'}-Aufzeichnung öffnen`}
      style={{
        bottom: 'calc(var(--app-bottom-nav-height) + env(safe-area-inset-bottom))',
        height: RECORDING_BAR_HEIGHT,
      }}
      className={cn(
        'fixed inset-x-0 z-40 flex items-center gap-3 border-t border-chrome-border px-4 text-white transition-colors',
        recording.status === 'active' ? 'app-chrome-active' : 'app-chrome-status',
      )}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">
        {recording.status === 'active' ? (
          <CircleDot aria-hidden="true" className="h-5 w-5 animate-pulse text-error-border" strokeWidth={2.4} />
        ) : (
          <Pause aria-hidden="true" className="h-5 w-5 text-chrome-muted" strokeWidth={2.4} />
        )}
      </span>

      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-sm font-semibold">{recording.label}</span>
        <span className="block text-[0.7rem] font-medium uppercase tracking-wide text-chrome-muted">
          {recording.status === 'active' ? 'Aufnahme läuft' : 'Pausiert'}
        </span>
      </span>

      <span className="shrink-0 text-base font-semibold tabular-nums">{metrics}</span>
      <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-chrome-muted" />
    </Link>
  )
}
