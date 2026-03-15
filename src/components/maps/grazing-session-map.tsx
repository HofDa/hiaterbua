'use client'

import { useEffect, useState } from 'react'
import { GrazingSessionMapCanvasPanel } from '@/components/maps/grazing-session-map-canvas-panel'
import { GrazingSessionHistoryPanel } from '@/components/maps/grazing-session-history-panel'
import { GrazingSessionLiveStatusCard } from '@/components/maps/grazing-session-live-status-card'
import { GrazingSessionManagementPanel } from '@/components/maps/grazing-session-management-panel'
import { useGrazingSessionMapScreen } from '@/components/maps/hooks/use-grazing-session-map-screen'
import {
  formatDistance,
  formatDuration,
} from '@/lib/maps/grazing-session-map-helpers'

export function GrazingSessionMap() {
  const [isMapExpanded, setIsMapExpanded] = useState(false)
  const {
    liveStatusCardProps,
    canvasPanelProps,
    managementPanelProps,
    historyPanelProps,
  } = useGrazingSessionMapScreen()

  const mobileMapSummary = `${canvasPanelProps.safeCurrentTrackpointsLength} Punkte · ${formatDistance(
    canvasPanelProps.currentDistanceM
  )} · ${formatDuration(canvasPanelProps.currentDurationS)}`
  const resizeMap = canvasPanelProps.onResizeMap

  useEffect(() => {
    if (!isMapExpanded) return

    resizeMap?.()
  }, [isMapExpanded, resizeMap])

  return (
    <section className="space-y-4">
      <GrazingSessionLiveStatusCard {...liveStatusCardProps} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,420px)] lg:items-start">
        <div className="space-y-4">
          <div className="lg:hidden">
            <GrazingSessionManagementPanel {...managementPanelProps} />
          </div>

          <div className="lg:hidden">
            <div className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-950">Karte</h2>
                  <p className="text-sm text-neutral-700">{mobileMapSummary}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMapExpanded((current) => !current)}
                  aria-expanded={isMapExpanded}
                  aria-label={isMapExpanded ? 'Karte schließen' : 'Karte öffnen'}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ccb98a] bg-[#fffdf6] text-lg font-semibold text-neutral-900 shadow-sm"
                >
                  {isMapExpanded ? '−' : '+'}
                </button>
              </div>
            </div>
          </div>

          <div
            aria-hidden={!isMapExpanded}
            className={[
              isMapExpanded ? 'block' : 'hidden',
              'lg:block',
            ].join(' ')}
          >
            <GrazingSessionMapCanvasPanel {...canvasPanelProps} />
          </div>

          <div className="lg:hidden">
            <GrazingSessionHistoryPanel {...historyPanelProps} />
          </div>
        </div>

        <div className="hidden space-y-4 lg:block">
          <GrazingSessionManagementPanel {...managementPanelProps} />
          <GrazingSessionHistoryPanel {...historyPanelProps} />
        </div>
      </div>
    </section>
  )
}
