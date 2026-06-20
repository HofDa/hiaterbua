'use client'

import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { GrazingSessionMapCanvasPanel } from '@/components/maps/grazing-session-map-canvas-panel'
import { GrazingSessionHistoryPanel } from '@/components/maps/grazing-session-history-panel'
import { GrazingSessionLiveStatusCard } from '@/components/maps/grazing-session-live-status-card'
import { GrazingSessionManagementPanel } from '@/components/maps/grazing-session-management-panel'
import {
  MobileMapSegmentButton,
  MobileMapSegmentedControl,
} from '@/components/maps/mobile-map-ui'
import { useGrazingSessionMapScreen } from '@/components/maps/hooks/use-grazing-session-map-screen'
import { useGrazingSessionMapStore } from '@/components/maps/hooks/use-grazing-session-map-store'
import {
  formatDistance,
  formatDuration,
} from '@/lib/maps/grazing-session-map-helpers'
import { cn } from '@/lib/utils/cn'

type GrazingMobileSection = 'manage' | 'history'

export function GrazingSessionMap() {
  // In the field the shepherd mostly starts/tracks the session (the "Steuerung"
  // tab) and reviews it on the map later — so keep the map collapsed by default
  // and let the controls lead. It stays one tap away via the "Karte" header.
  const [isMapExpanded, setIsMapExpanded] = useState(false)
  const [mobileSection, setMobileSection] = useState<GrazingMobileSection>('manage')
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

  // GPS problems are actionable even when the map is closed, so the status card
  // (which carries the "Standort aktivieren" retry) must stay reachable on mobile.
  const gpsNeedsAttention = useGrazingSessionMapStore(
    (state) => state.status.gpsState === 'denied' || state.status.gpsState === 'error',
  )

  useEffect(() => {
    if (!isMapExpanded) return

    resizeMap()
  }, [isMapExpanded, resizeMap])

  return (
    <section className="space-y-4">
      {/* GPS/live-status only matters while actually mapping. On mobile the map is
          collapsed by default, so show this only once the map is opened (or when
          GPS needs attention); desktop always shows it. */}
      <div className={cn('lg:block', isMapExpanded || gpsNeedsAttention ? 'block' : 'hidden')}>
        <GrazingSessionLiveStatusCard />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,420px)] lg:items-start">
        <div className="space-y-4">
          <div className="app-panel overflow-hidden lg:sticky lg:top-4">
            <button
              type="button"
              onClick={() => setIsMapExpanded((current) => !current)}
              aria-expanded={isMapExpanded}
              aria-label={isMapExpanded ? 'Karte schließen' : 'Karte öffnen'}
              className={cn(
                'flex w-full items-center justify-between gap-3 px-5 py-4 text-left lg:hidden',
                isMapExpanded && 'border-b border-border',
              )}
            >
              <span className="min-w-0">
                <span className="block text-lg font-semibold text-ink-strong">Karte</span>
                <span className="block text-sm text-ink-muted">{mobileMapSummary}</span>
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-ink">
                <ChevronDown
                  aria-hidden="true"
                  className={cn('h-5 w-5 transition-transform', isMapExpanded && 'rotate-180')}
                />
              </span>
            </button>

            <div
              aria-hidden={!isMapExpanded}
              className={cn(
                'overflow-hidden transition-all duration-200 ease-out',
                isMapExpanded
                  ? 'max-h-[100rem] opacity-100'
                  : 'pointer-events-none max-h-0 opacity-0',
                'lg:max-h-none lg:overflow-visible lg:opacity-100 lg:pointer-events-auto',
              )}
            >
              <GrazingSessionMapCanvasPanel containerRef={containerRef} embedded />
            </div>
          </div>

          {/* Mobile section switcher — mirrors the enclosure screen's
              map → tabs → panel flow so the two map screens feel like siblings. */}
          <div className="space-y-3 lg:hidden">
            <MobileMapSegmentedControl>
              <MobileMapSegmentButton
                onClick={() => setMobileSection('manage')}
                active={mobileSection === 'manage'}
              >
                Steuerung
              </MobileMapSegmentButton>
              <MobileMapSegmentButton
                onClick={() => setMobileSection('history')}
                active={mobileSection === 'history'}
              >
                Historie
              </MobileMapSegmentButton>
            </MobileMapSegmentedControl>

            <div className={mobileSection === 'manage' ? 'block' : 'hidden'}>
              <GrazingSessionManagementPanel />
            </div>
            <div className={mobileSection === 'history' ? 'block' : 'hidden'}>
              <GrazingSessionHistoryPanel />
            </div>
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
