'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, CircleDot, Pause } from 'lucide-react'
import {
  getRecordingElapsedS,
  useActiveRecording,
} from '@/components/layout/use-active-recording'
import { metaLabelClassName } from '@/components/ui/typography'
import { formatDistance, formatDuration } from '@/lib/maps/grazing-session-map-helpers'
import { triggerHaptic } from '@/hooks/use-haptic-feedback'

// Home-screen hero while a recording runs: the answer to "what am I doing
// right now" belongs above everything else, one tap from resuming the session.
export function ContinueRecordingCard() {
  const recording = useActiveRecording()

  const [nowMs, setNowMs] = useState(() => Date.now())
  const isActive = recording?.status === 'active'
  const startTime = recording?.startTime

  useEffect(() => {
    if (!isActive) return
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [isActive, startTime])

  if (!recording) return null

  const elapsedS = getRecordingElapsedS(recording, nowMs)
  const metrics =
    recording.distanceM !== null
      ? `${formatDuration(elapsedS)} · ${formatDistance(recording.distanceM)}`
      : formatDuration(elapsedS)

  return (
    <Link
      href={recording.href}
      onClick={() => triggerHaptic('light')}
      className="flex min-h-20 items-center gap-3 rounded-[1.35rem] border-2 border-border-ink bg-surface-raised px-4 py-4 text-ink app-shadow-action-strong transition-colors hover:bg-surface-hover"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-accent text-primary">
        {recording.status === 'active' ? (
          <CircleDot
            aria-hidden="true"
            className="h-6 w-6 animate-pulse text-error-ink"
            strokeWidth={2.4}
          />
        ) : (
          <Pause aria-hidden="true" className="h-6 w-6" strokeWidth={2.4} />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className={metaLabelClassName({ tracking: 'wider', tone: 'soft' }, 'block')}>
          {recording.status === 'active' ? 'Aufnahme läuft' : 'Pausiert'}
        </span>
        <span className="mt-0.5 block truncate text-lg font-semibold leading-tight text-ink-strong">
          {recording.label}
        </span>
        <span className="mt-0.5 block text-sm font-semibold tabular-nums text-ink-muted">
          {metrics}
        </span>
      </span>

      <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-ink-muted" />
    </Link>
  )
}
