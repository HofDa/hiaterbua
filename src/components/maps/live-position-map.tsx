'use client'

import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { LivePositionMapCanvasPanel } from '@/components/maps/live-position-map-canvas-panel'
import { LivePositionSidebarPanel } from '@/components/maps/live-position-sidebar-panel'
import { LivePositionStatusCard } from '@/components/maps/live-position-status-card'
import { LivePositionWorkflowPanels } from '@/components/maps/live-position-workflow-panels'
import { useLivePositionMapScreen } from '@/components/maps/hooks/use-live-position-map-screen'
import { useLivePositionMapStore } from '@/components/maps/hooks/use-live-position-map-store'
import type { MobilePanel } from '@/components/maps/live-position-map-types'
import { cn } from '@/lib/utils/cn'
import type { Enclosure } from '@/types/domain'

export function LivePositionMap() {
  // The frequent field task is assigning/unassigning herds (the "Pferche" tab),
  // not the map — drawing a Pferch is a rare, one-off. So keep the map collapsed
  // by default and let the quick actions lead; the draw/walk tabs open it on demand.
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false)
  const {
    containerRef,
    resizeMap,
    filteredEnclosuresCount,
    onMobilePanelChange,
    onFocusEnclosure,
    onStartEditEnclosure,
  } = useLivePositionMapScreen()

  const mobileMapSummary = filteredEnclosuresCount
    ? `${filteredEnclosuresCount} Pferche in Reichweite`
    : 'Noch keine Pferche sichtbar'

  // GPS problems are actionable even when the map is closed, so the status card
  // (which carries the "Standort aktivieren" retry) must stay reachable on mobile.
  const gpsNeedsAttention = useLivePositionMapStore(
    (state) => state.status.gpsState === 'denied' || state.status.gpsState === 'error',
  )

  useEffect(() => {
    if (!isMobileMapOpen) return

    resizeMap()
  }, [isMobileMapOpen, resizeMap])

  function handleMobilePanelChange(nextPanel: MobilePanel) {
    onMobilePanelChange(nextPanel)

    // Drawing and walking a Pferch both happen on the map, so reveal it; the
    // "Pferche" (assign) tab stays map-free for quick in/out herd changes.
    if (nextPanel === 'draw' || nextPanel === 'walk') {
      setIsMobileMapOpen(true)
    }
  }

  function handleFocusEnclosureFromSavedList(enclosure: Enclosure) {
    setIsMobileMapOpen(true)
    onFocusEnclosure(enclosure)
  }

  function handleStartEditEnclosureFromSavedList(enclosure: Enclosure) {
    setIsMobileMapOpen(true)
    onStartEditEnclosure(enclosure)
  }

  return (
    <section className="space-y-4">
      {/* GPS/live-status only matters while actually mapping. On mobile the map is
          collapsed by default, so show this only once the map is opened (or when
          GPS needs attention); desktop always shows it. */}
      <div className={cn('lg:block', isMobileMapOpen || gpsNeedsAttention ? 'block' : 'hidden')}>
        <LivePositionStatusCard />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,420px)] lg:items-start">
        <div>
          <div className="space-y-3">
            <div className="app-panel overflow-hidden">
              <button
                type="button"
                onClick={() => setIsMobileMapOpen((current) => !current)}
                aria-expanded={isMobileMapOpen}
                aria-label={isMobileMapOpen ? 'Karte schließen' : 'Karte öffnen'}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-5 py-4 text-left lg:hidden',
                  isMobileMapOpen && 'border-b border-border',
                )}
              >
                <span className="min-w-0">
                  <span className="block text-lg font-semibold text-ink-strong">Karte</span>
                  <span className="block text-sm text-ink-muted">{mobileMapSummary}</span>
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-ink">
                  <ChevronDown
                    aria-hidden="true"
                    className={cn('h-5 w-5 transition-transform', isMobileMapOpen && 'rotate-180')}
                  />
                </span>
              </button>

              <div
                aria-hidden={!isMobileMapOpen}
                className={cn(
                  'overflow-hidden transition-all duration-200 ease-out',
                  isMobileMapOpen
                    ? 'max-h-[100rem] opacity-100'
                    : 'pointer-events-none max-h-0 opacity-0',
                  'lg:max-h-none lg:overflow-visible lg:opacity-100 lg:pointer-events-auto',
                )}
              >
                <LivePositionMapCanvasPanel containerRef={containerRef} embedded />
              </div>
            </div>

            <div className="lg:hidden">
              <LivePositionWorkflowPanels
                onMobilePanelChange={handleMobilePanelChange}
                onStartEditEnclosure={handleStartEditEnclosureFromSavedList}
              />
            </div>
          </div>
        </div>

        <div>
          <LivePositionSidebarPanel
            onFocusEnclosure={handleFocusEnclosureFromSavedList}
            onStartEditEnclosure={handleStartEditEnclosureFromSavedList}
          />
        </div>
      </div>
    </section>
  )
}
