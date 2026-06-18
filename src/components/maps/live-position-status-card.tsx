'use client'

import { formatTimestamp, type GpsState } from '@/lib/maps/map-core'
import { LiveStatusCard, type StatusItem } from '@/components/maps/live-status-card'
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
  const items: StatusItem[] = [
    { label: 'GPS', value: gpsDetail },
    { label: 'Filter', value: gpsFilterDetail },
    {
      label: 'Koordinaten',
      value: position
        ? `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`
        : 'Noch keine Position',
    },
    {
      label: 'Update',
      value: position ? formatTimestamp(position.timestamp) : 'Warte auf GPS',
    },
  ]

  return (
    <LiveStatusCard
      isOpen={isLiveStatusOpen}
      gpsState={gpsState}
      gpsLabel={gpsLabel}
      items={items}
      onToggle={onToggle}
    />
  )
}
