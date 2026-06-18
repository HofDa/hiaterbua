'use client'

import { LiveStatusCard, type StatusItem } from '@/components/maps/live-status-card'
import type { GpsState } from '@/lib/maps/map-core'

type GrazingSessionLiveStatusCardProps = {
  gpsState: GpsState
  gpsLabel: string
  gpsDetail: string
  gpsFilterDetail: string
  herdLabel: string
  statusLabel: string
  coordinatesLabel: string
  updateLabel: string
  isOpen: boolean
  onToggleOpen: () => void
}

export function GrazingSessionLiveStatusCard({
  gpsState,
  gpsLabel,
  gpsDetail,
  gpsFilterDetail,
  herdLabel,
  statusLabel,
  coordinatesLabel,
  updateLabel,
  isOpen,
  onToggleOpen,
}: GrazingSessionLiveStatusCardProps) {
  const items: StatusItem[] = [
    { label: 'GPS', value: gpsDetail },
    { label: 'Filter', value: gpsFilterDetail },
    { label: 'Herde', value: herdLabel },
    { label: 'Status', value: statusLabel },
    { label: 'Koordinaten', value: coordinatesLabel, className: 'sm:col-span-2 xl:col-span-2' },
    { label: 'Update', value: updateLabel, className: 'sm:col-span-2 xl:col-span-2' },
  ]

  return (
    <LiveStatusCard
      isOpen={isOpen}
      gpsState={gpsState}
      gpsLabel={gpsLabel}
      items={items}
      onToggle={onToggleOpen}
    />
  )
}
