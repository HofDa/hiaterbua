'use client'

import { CheckCircle2, X } from 'lucide-react'
import type { LastStoppedSession } from '@/components/maps/hooks/use-grazing-session-map-state'
import { useNowTick } from '@/hooks/use-now-tick'
import { formatDistance, formatDurationWords } from '@/lib/maps/grazing-session-map-helpers'

/** "Rückgängig" is offered this long; the repository allows a little slack. */
const UNDO_VISIBLE_MS = 10_000

/**
 * The end of a walk: what was saved, a way to look at it, and a short window to
 * undo a mistaken stop. Ending used to drop the user silently back to the herd
 * picker — the moment that most colours how the whole app feels.
 */
export function GrazingSessionStopSummary({
  stopped,
  isSaving,
  onUndo,
  onShowInHistory,
  onDismiss,
}: {
  stopped: LastStoppedSession
  isSaving: boolean
  onUndo: () => void | Promise<void>
  onShowInHistory: () => void
  onDismiss: () => void
}) {
  const stoppedAtMs = Date.parse(stopped.stoppedAt)
  const nowMs = useNowTick(true)
  const remainingS = Math.ceil((UNDO_VISIBLE_MS - (nowMs - stoppedAtMs)) / 1000)
  const canUndo = remainingS > 0

  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-[1.35rem] border-2 border-success-ink bg-success-surface p-4 text-ink-strong"
    >
      <div className="flex items-start gap-3">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 h-7 w-7 shrink-0 text-success-ink" strokeWidth={2.4} />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold leading-tight">Weidegang gespeichert</h3>
          <p className="mt-0.5 text-base font-semibold text-ink [overflow-wrap:anywhere]">
            {stopped.herdName}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Hinweis schließen"
          className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden="true" className="h-5 w-5" strokeWidth={2.4} />
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-[0.9rem] bg-surface-raised px-2 py-2">
          <dt className="text-xs font-semibold text-ink-muted">Dauer</dt>
          <dd className="mt-0.5 text-base font-bold tabular-nums">
            {formatDurationWords(stopped.durationS)}
          </dd>
        </div>
        <div className="rounded-[0.9rem] bg-surface-raised px-2 py-2">
          <dt className="text-xs font-semibold text-ink-muted">Strecke</dt>
          <dd className="mt-0.5 text-base font-bold tabular-nums">
            {formatDistance(stopped.distanceM)}
          </dd>
        </div>
        <div className="rounded-[0.9rem] bg-surface-raised px-2 py-2">
          <dt className="text-xs font-semibold text-ink-muted">Tiere</dt>
          <dd className="mt-0.5 text-base font-bold tabular-nums">
            {stopped.animalCount ?? '–'}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-2">
        {canUndo ? (
          <button
            type="button"
            onClick={() => void onUndo()}
            disabled={isSaving}
            className="min-h-12 w-full rounded-[1.1rem] border-2 border-border-ink bg-surface-raised px-4 py-3 text-base font-semibold text-ink-strong transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50"
          >
            Rückgängig – weiter aufzeichnen{' '}
            <span className="tabular-nums text-ink-muted">({remainingS} s)</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={onShowInHistory}
          className="min-h-12 w-full rounded-[1.1rem] border-2 border-border bg-surface-raised px-4 py-3 text-base font-semibold text-ink transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          Im Verlauf ansehen
        </button>
      </div>
    </section>
  )
}
