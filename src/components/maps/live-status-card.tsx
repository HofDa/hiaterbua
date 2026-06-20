import { ChevronDown } from 'lucide-react'
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
  onRequestGps?: () => void
}

export function LiveStatusCard({
  isOpen,
  gpsState,
  gpsLabel,
  items,
  onToggle,
  onRequestGps,
}: LiveStatusCardProps) {
  const showGpsAction =
    onRequestGps !== undefined && (gpsState === 'denied' || gpsState === 'error')
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
          <ChevronDown
            aria-hidden="true"
            className={cn('h-4 w-4 text-ink transition-transform', isOpen && 'rotate-180')}
          />
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

      {showGpsAction ? (
        <div className="mt-3 flex flex-col gap-2 rounded-[1rem] border border-error-border bg-error-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-error-ink">
            {gpsState === 'denied'
              ? 'Standortzugriff ist blockiert. Im Gerät oder Browser erlauben.'
              : 'Standort konnte nicht ermittelt werden.'}
          </p>
          <button
            type="button"
            onClick={onRequestGps}
            className="shrink-0 rounded-full border border-error-border bg-surface-raised px-4 py-2 text-sm font-semibold text-error-ink active:scale-[0.98]"
          >
            Standort aktivieren
          </button>
        </div>
      ) : null}

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
