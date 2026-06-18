import type { GpsState } from '@/lib/maps/map-core'
import { cn } from '@/lib/utils/cn'
import { MetaLabel, metaLabelClassName } from '@/components/ui/typography'

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
    <div className="app-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className={cn('flex items-center gap-2', metaLabelClassName({ tracking: 'wide' }))}
        >
          <span>Live-Status</span>
          <span className="text-sm text-ink">{isOpen ? '−' : '+'}</span>
        </button>
        <div
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-semibold',
            gpsState === 'tracking'
              ? 'bg-accent text-ink'
              : gpsState === 'denied' || gpsState === 'error'
                ? 'bg-error-surface text-error-ink'
                : 'bg-surface-muted text-ink',
          )}
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
                'app-surface-row px-4 py-3',
                item.className,
              )}
            >
              <MetaLabel size="micro" tone="soft">
                {item.label}
              </MetaLabel>
              <div className="mt-1 text-sm font-medium text-ink">{item.value}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
