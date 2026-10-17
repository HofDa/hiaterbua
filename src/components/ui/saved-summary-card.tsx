'use client'

import { CheckCircle2, X } from 'lucide-react'
import { useNowTick } from '@/hooks/use-now-tick'

/** "Rückgängig" is offered this long after the save. */
const UNDO_VISIBLE_MS = 10_000

export type SavedSummaryStat = { label: string; value: string }

/**
 * The one "saved + undo" moment for every commit that ends something
 * (Weidegang, Arbeitseinsatz): what was saved, a short window to undo, and an
 * optional way to look at it. Ending used to feel different in every flow.
 */
export function SavedSummaryCard({
  title,
  subtitle,
  stats,
  savedAt,
  undoLabel,
  isBusy = false,
  onUndo,
  secondaryAction,
  onDismiss,
}: {
  title: string
  subtitle?: string
  stats: SavedSummaryStat[]
  /** ISO time of the save; the undo window counts from here. */
  savedAt: string
  undoLabel: string
  isBusy?: boolean
  onUndo: () => void | Promise<void>
  secondaryAction?: { label: string; onClick: () => void }
  onDismiss: () => void
}) {
  const nowMs = useNowTick(true)
  const remainingS = Math.ceil((UNDO_VISIBLE_MS - (nowMs - Date.parse(savedAt))) / 1000)
  const canUndo = remainingS > 0
  // Empty values ("–") say nothing; leave them out.
  const shownStats = stats.filter((stat) => stat.value && stat.value !== '–')

  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-[1.35rem] border-2 border-success-ink bg-success-surface p-4 text-ink-strong"
    >
      <div className="flex items-start gap-3">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 h-7 w-7 shrink-0 text-success-ink" strokeWidth={2.4} />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold leading-tight">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 text-base font-semibold text-ink [overflow-wrap:anywhere]">{subtitle}</p>
          ) : null}
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

      {shownStats.length > 0 ? (
        <dl className="mt-3 grid grid-cols-3 gap-3">
          {shownStats.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <dt className="text-xs font-semibold text-ink-muted">{stat.label}</dt>
              <dd className="mt-0.5 text-base font-bold tabular-nums [overflow-wrap:anywhere]">{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-4 grid gap-2">
        {canUndo ? (
          <button
            type="button"
            onClick={() => void onUndo()}
            disabled={isBusy}
            className="min-h-12 w-full rounded-[1.1rem] border-2 border-border-ink bg-surface-raised px-4 py-3 text-base font-semibold text-ink-strong transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50"
          >
            {undoLabel} <span className="tabular-nums text-ink-muted">({remainingS} s)</span>
          </button>
        ) : null}
        {secondaryAction ? (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className="min-h-12 w-full rounded-[1.1rem] border-2 border-border bg-surface-raised px-4 py-3 text-base font-semibold text-ink transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            {secondaryAction.label}
          </button>
        ) : null}
      </div>
    </section>
  )
}
