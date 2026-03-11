'use client'

import { formatTimestamp, type GpsState } from '@/lib/maps/map-core'
import type { PositionData } from '@/components/maps/live-position-map-types'

export type LivePositionStatusCardProps = {
  isLiveStatusOpen: boolean
  gpsState: GpsState
  gpsLabel: string
  gpsDetail: string
  gpsFilterDetail: string
  position: PositionData | null
  onToggle: () => void
}

export function LivePositionStatusCard({
  isLiveStatusOpen,
  gpsState,
  gpsLabel,
  gpsDetail,
  gpsFilterDetail,
  position,
  onToggle,
}: LivePositionStatusCardProps) {
  return (
    <div className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isLiveStatusOpen}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-600"
        >
          <span>Live-Status</span>
          <span className="text-sm text-neutral-900">{isLiveStatusOpen ? '−' : '+'}</span>
        </button>
        <div
          className={[
            'rounded-full px-3 py-1.5 text-xs font-semibold',
            gpsState === 'tracking'
              ? 'bg-[#efe4c8] text-[#17130f]'
              : gpsState === 'denied' || gpsState === 'error'
                ? 'bg-red-100 text-red-800'
                : 'bg-[#f1efeb] text-stone-900',
          ].join(' ')}
        >
          {gpsLabel}
        </div>
      </div>

      {isLiveStatusOpen ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              GPS
            </div>
            <div className="mt-1 text-sm font-medium text-neutral-900">{gpsDetail}</div>
          </div>
          <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Filter
            </div>
            <div className="mt-1 text-sm font-medium text-neutral-900">{gpsFilterDetail}</div>
          </div>
          <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Koordinaten
            </div>
            <div className="mt-1 text-sm font-medium text-neutral-900">
              {position
                ? `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`
                : 'Noch keine Position'}
            </div>
          </div>
          <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Update
            </div>
            <div className="mt-1 text-sm font-medium text-neutral-900">
              {position ? formatTimestamp(position.timestamp) : 'Warte auf GPS'}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
