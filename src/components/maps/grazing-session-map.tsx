'use client'

import { GrazingSessionMapCanvasPanel } from '@/components/maps/grazing-session-map-canvas-panel'
import { GrazingSessionHistoryPanel } from '@/components/maps/grazing-session-history-panel'
import { GrazingSessionLiveStatusCard } from '@/components/maps/grazing-session-live-status-card'
import { GrazingSessionManagementPanel } from '@/components/maps/grazing-session-management-panel'
import { useGrazingSessionMapScreen } from '@/components/maps/hooks/use-grazing-session-map-screen'

export function GrazingSessionMap() {
  const {
    liveStatusCardProps,
    canvasPanelProps,
    managementPanelProps,
    historyPanelProps,
  } = useGrazingSessionMapScreen()

  return (
    <section className="space-y-4">
      <GrazingSessionLiveStatusCard {...liveStatusCardProps} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,420px)] lg:items-start">
        <div>
          <GrazingSessionMapCanvasPanel {...canvasPanelProps} />
        </div>

        <div className="space-y-4">
          <GrazingSessionManagementPanel {...managementPanelProps} />

          <GrazingSessionHistoryPanel {...historyPanelProps} />
        </div>
      </div>
    </section>
  )
}
