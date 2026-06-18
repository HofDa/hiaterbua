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
import { cn } from '@/lib/utils/cn'

export function GrazingSessionMap() {
  const [isMapExpanded, setIsMapExpanded] = useState(false)
  const {
    containerRef,
    resizeMap,
    safeCurrentTrackpointsLength,
    currentDistanceM,
    currentDurationS,
  } = useGrazingSessionMapScreen()

  const mobileMapSummary = `${safeCurrentTrackpointsLength} Punkte · ${formatDistance(
    currentDistanceM
  )} · ${formatDuration(currentDurationS)}`

  useEffect(() => {
    if (!isMapExpanded) return

    resizeMap()
  }, [isMapExpanded, resizeMap])

  return (
    <section className="space-y-4">
      <GrazingSessionLiveStatusCard />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,420px)] lg:items-start">
        <div className="space-y-4">
          <div className="lg:hidden">
            <GrazingSessionManagementPanel />
          </div>

          <div className="lg:hidden">
            <div className="app-panel p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-ink-strong">Karte</h2>
                  <p className="text-sm text-ink-muted">{mobileMapSummary}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMapExpanded((current) => !current)}
                  aria-expanded={isMapExpanded}
                  aria-label={isMapExpanded ? 'Karte schließen' : 'Karte öffnen'}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-raised text-lg font-semibold text-ink shadow-sm"
                >
                  {isMapExpanded ? '−' : '+'}
                </button>
              </div>
            </div>
          </div>

          <div
            aria-hidden={!isMapExpanded}
            className={cn(isMapExpanded ? 'block' : 'hidden', 'lg:block')}
          >
            <GrazingSessionMapCanvasPanel containerRef={containerRef} />
          </div>

          <div className="lg:hidden">
            <GrazingSessionHistoryPanel />
          </div>
        </div>

        <div className="hidden space-y-4 lg:block">
          <GrazingSessionManagementPanel />
          <GrazingSessionHistoryPanel />
        </div>
      </div>
    </section>
  )
}
