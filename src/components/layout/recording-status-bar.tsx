'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getRecoverableSessionKey } from '@/lib/session-recovery/session-recovery-state'
import { useRecoveryNoticeStore } from '@/lib/session-recovery/recovery-notice-store'
import { ChevronRight, Pause, RotateCcw } from 'lucide-react'
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
  // On Start the "Aufnahme läuft" card already leads the page; a second copy
  // of the same recording right below it is noise.
  const isHome = usePathname() === '/'
  const isRecording = recording != null && !isHome
  const pendingRecoveryKey = useRecoveryNoticeStore((state) => state.pendingSessionKey)

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

  if (!recording || isHome) return null

  const elapsedS = getRecordingElapsedS(recording, nowMs)

  const metrics =
    recording.distanceM !== null
      ? `${formatDuration(elapsedS)} · ${formatDistance(recording.distanceM)}`
      : formatDuration(elapsedS)

  const isRecoveryPending =
    pendingRecoveryKey === getRecoverableSessionKey(recording.kind, recording.id)
  const isActive = recording.status === 'active'
  const kindLabel = recording.kind === 'grazing' ? 'Weidegang' : 'Arbeitseinsatz'

  return (
    <Link
      href={recording.href}
      onClick={() => triggerHaptic('light')}
      aria-label={
        isRecoveryPending
          ? `${kindLabel} wiederhergestellt – öffnen und prüfen`
          : `Laufenden ${kindLabel} öffnen`
      }
      style={{
        bottom: 'calc(var(--app-bottom-nav-height) + env(safe-area-inset-bottom))',
        height: RECORDING_BAR_HEIGHT,
      }}
      className={cn(
        'fixed inset-x-0 z-40 flex items-center gap-3 border-t px-4 transition-colors',
        isRecoveryPending
          ? 'border-warning-border bg-warning-callout text-ink-strong'
          : cn('border-chrome-border text-white', isActive ? 'app-chrome-active' : 'app-chrome-status'),
      )}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">
        {isRecoveryPending ? (
          <RotateCcw aria-hidden="true" className="h-5 w-5 text-warning-ink" strokeWidth={2.6} />
        ) : isActive ? (
          // White pulsing dot: the red-on-green icon was hard to see and
          // relied on red/green alone.
          <span aria-hidden="true" className="relative flex h-4 w-4">
            <span className="absolute inset-0 animate-ping rounded-full bg-white/70 motion-reduce:animate-none" />
            <span className="relative h-4 w-4 rounded-full border-2 border-chrome-border bg-white" />
          </span>
        ) : (
          <Pause aria-hidden="true" className="h-5 w-5 text-chrome-muted" strokeWidth={2.4} />
        )}
      </span>

      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-sm font-semibold">{recording.label}</span>
        <span
          className={cn(
            'block text-xs font-semibold uppercase tracking-wide',
            isRecoveryPending ? 'text-warning-ink' : 'text-chrome-muted',
          )}
        >
          {isRecoveryPending
            ? 'Wiederhergestellt'
            : isActive
              ? recording.kind === 'grazing'
                ? 'Aufnahme läuft'
                : 'Zeit läuft'
              : 'Pausiert'}
        </span>
      </span>

      <span className="shrink-0 text-base font-semibold tabular-nums">{metrics}</span>
      <ChevronRight
        aria-hidden="true"
        className={cn('h-5 w-5 shrink-0', isRecoveryPending ? 'text-ink-muted' : 'text-chrome-muted')}
      />
    </Link>
  )
}
