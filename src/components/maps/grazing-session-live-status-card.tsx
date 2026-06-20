'use client'

import { LiveStatusCard, type StatusItem } from '@/components/maps/live-status-card'
import { requestGpsRetry } from '@/components/maps/hooks/use-geolocation-watcher'
import { useGrazingSessionMapStore } from '@/components/maps/hooks/use-grazing-session-map-store'

export function GrazingSessionLiveStatusCard() {
  const isOpen = useGrazingSessionMapStore((state) => state.isLiveStatusOpen)
  const toggle = useGrazingSessionMapStore((state) => state.toggleLiveStatus)
  const {
    gpsState,
    gpsLabel,
    gpsDetail,
    gpsFilterDetail,
    herdLabel,
    statusLabel,
    coordinatesLabel,
    updateLabel,
  } = useGrazingSessionMapStore((state) => state.status)

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
      onToggle={toggle}
      onRequestGps={requestGpsRetry}
    />
  )
}
