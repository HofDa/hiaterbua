import type { GpsState } from '@/lib/maps/map-core'
import { cn } from '@/lib/utils/cn'

export type StatusItem = {
  label: string
  value: string
  className?: string
}

type LiveStatusCardProps = {
  isOpen: boolean
  gpsState: GpsState
  gpsLabel: string
  items: StatusItem[]
  onToggle: () => void
}

export function LiveStatusCard({
  isOpen,
  gpsState,
  gpsLabel,
  items,
  onToggle,
}: LiveStatusCardProps) {
  return (
    <div className="rounded-[1.9rem] border-2 border-border-ink bg-surface p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-600"
        >
          <span>Live-Status</span>
          <span className="text-sm text-neutral-900">{isOpen ? '−' : '+'}</span>
        </button>
        <div
          className={[
            'rounded-full px-3 py-1.5 text-xs font-semibold',
            gpsState === 'tracking'
              ? 'bg-accent text-ink'
              : gpsState === 'denied' || gpsState === 'error'
                ? 'bg-red-100 text-red-800'
                : 'bg-surface-muted text-stone-900',
          ].join(' ')}
        >
          {gpsLabel}
        </div>
      </div>

      {isOpen ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.label}
              className={cn(
                'rounded-[1.1rem] border border-border bg-surface-raised px-4 py-3 shadow-sm',
                item.className,
              )}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                {item.label}
              </div>
              <div className="mt-1 text-sm font-medium text-neutral-900">{item.value}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
