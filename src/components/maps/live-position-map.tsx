'use client'

import { useEffect, useState } from 'react'
import { LivePositionMapCanvasPanel } from '@/components/maps/live-position-map-canvas-panel'
import { LivePositionSidebarPanel } from '@/components/maps/live-position-sidebar-panel'
import { LivePositionStatusCard } from '@/components/maps/live-position-status-card'
import { LivePositionWorkflowPanels } from '@/components/maps/live-position-workflow-panels'
import { useLivePositionMapScreen } from '@/components/maps/hooks/use-live-position-map-screen'
import type { MobilePanel } from '@/components/maps/live-position-map-types'
import { cn } from '@/lib/utils/cn'
import type { Enclosure } from '@/types/domain'

export function LivePositionMap() {
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

  useEffect(() => {
    if (!isMobileMapOpen) return

    resizeMap()
  }, [isMobileMapOpen, resizeMap])

  function handleMobilePanelChange(nextPanel: MobilePanel) {
    onMobilePanelChange(nextPanel)

    if (nextPanel === 'draw') {
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
      <LivePositionStatusCard />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,420px)] lg:items-start">
        <div>
          <div className="space-y-3">
            <div className="lg:hidden">
              <div className="app-panel p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-ink-strong">Karte</h2>
                    <p className="text-sm text-ink-muted">{mobileMapSummary}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobileMapOpen((current) => !current)}
                    aria-expanded={isMobileMapOpen}
                    aria-label={isMobileMapOpen ? 'Karte schließen' : 'Karte öffnen'}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-raised text-lg font-semibold text-ink shadow-sm"
                  >
                    {isMobileMapOpen ? '−' : '+'}
                  </button>
                </div>
              </div>
            </div>

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
              <LivePositionMapCanvasPanel containerRef={containerRef} />
            </div>

            <div className="lg:hidden">
              <LivePositionWorkflowPanels onMobilePanelChange={handleMobilePanelChange} />
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
