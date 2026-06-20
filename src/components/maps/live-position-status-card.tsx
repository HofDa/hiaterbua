'use client'

import { formatTimestamp } from '@/lib/maps/map-core'
import { LiveStatusCard, type StatusItem } from '@/components/maps/live-status-card'
import { requestGpsRetry } from '@/components/maps/hooks/use-geolocation-watcher'
import { useLivePositionMapStore } from '@/components/maps/hooks/use-live-position-map-store'

export function LivePositionStatusCard() {
  const isOpen = useLivePositionMapStore((state) => state.isLiveStatusOpen)
  const toggle = useLivePositionMapStore((state) => state.toggleLiveStatus)
  const { gpsState, gpsLabel, gpsDetail, gpsFilterDetail, position } =
    useLivePositionMapStore((state) => state.status)

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
      isOpen={isOpen}
      gpsState={gpsState}
      gpsLabel={gpsLabel}
      items={items}
      onToggle={toggle}
      onRequestGps={requestGpsRetry}
    />
  )
}
