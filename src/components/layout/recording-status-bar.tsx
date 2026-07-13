'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight, CircleDot, Pause } from 'lucide-react'
import { formatDistance, formatDuration } from '@/lib/maps/grazing-session-map-helpers'
import { triggerHaptic } from '@/hooks/use-haptic-feedback'
import { cn } from '@/lib/utils/cn'
import { getRecordingElapsedS, useActiveRecordingSnapshot } from './use-active-recording'

// Fixed height of the bar. Published to `--app-recording-bar-height` so page
// content and bottom-fixed banners reserve matching space; kept in one place so
// the visual height and the reserved offset can't drift apart.
const RECORDING_BAR_HEIGHT = '3.25rem'

export function RecordingStatusBar() {
  const { recording, nowMs } = useActiveRecordingSnapshot()
  const isRecording = recording != null

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

  const elapsedS = getRecordingElapsedS(recording, nowMs)

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
