'use client'

import { LivePositionMapCanvasPanel } from '@/components/maps/live-position-map-canvas-panel'
import { LivePositionSidebarPanel } from '@/components/maps/live-position-sidebar-panel'
import { LivePositionStatusCard } from '@/components/maps/live-position-status-card'
import { LivePositionWorkflowPanels } from '@/components/maps/live-position-workflow-panels'
import { useLivePositionMapScreen } from '@/components/maps/hooks/use-live-position-map-screen'

export function LivePositionMap() {
  const {
    statusCardProps,
    canvasPanelProps,
    workflowPanelsProps,
    sidebarPanelProps,
  } = useLivePositionMapScreen()

  return (
    <section className="space-y-4">
      <LivePositionStatusCard {...statusCardProps} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,420px)] lg:items-start">
        <div>
          <LivePositionMapCanvasPanel {...canvasPanelProps} />
        </div>

        <div className="lg:hidden">
          <LivePositionWorkflowPanels {...workflowPanelsProps} />
        </div>

        <div>
          <LivePositionSidebarPanel {...sidebarPanelProps} />
        </div>
      </div>
    </section>
  )
}
