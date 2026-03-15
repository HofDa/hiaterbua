'use client'

import { useEffect, useState } from 'react'
import { LivePositionMapCanvasPanel } from '@/components/maps/live-position-map-canvas-panel'
import { LivePositionSidebarPanel } from '@/components/maps/live-position-sidebar-panel'
import { LivePositionStatusCard } from '@/components/maps/live-position-status-card'
import { LivePositionWorkflowPanels } from '@/components/maps/live-position-workflow-panels'
import { useLivePositionMapScreen } from '@/components/maps/hooks/use-live-position-map-screen'

export function LivePositionMap() {
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false)
  const {
    statusCardProps,
    canvasPanelProps,
    workflowPanelsProps,
    sidebarPanelProps,
  } = useLivePositionMapScreen()

  const mobileMapSummary = sidebarPanelProps.filteredEnclosures.length
    ? `${sidebarPanelProps.filteredEnclosures.length} Pferche in Reichweite`
    : 'Noch keine Pferche sichtbar'
  const resizeMap = canvasPanelProps.onResizeMap

  useEffect(() => {
    if (!isMobileMapOpen) return

    resizeMap?.()
  }, [isMobileMapOpen, resizeMap])

  function handleMobilePanelChange(nextPanel: typeof workflowPanelsProps.mobilePanel) {
    workflowPanelsProps.onMobilePanelChange(nextPanel)

    if (nextPanel === 'draw') {
      setIsMobileMapOpen(true)
    }
  }

  function handleFocusEnclosureFromSavedList(
    enclosure: Parameters<typeof sidebarPanelProps.onFocusEnclosure>[0]
  ) {
    setIsMobileMapOpen(true)
    sidebarPanelProps.onFocusEnclosure(enclosure)
  }

  function handleStartEditEnclosureFromSavedList(
    enclosure: Parameters<typeof sidebarPanelProps.onStartEditEnclosure>[0]
  ) {
    setIsMobileMapOpen(true)
    sidebarPanelProps.onStartEditEnclosure(enclosure)
  }

  function handleSelectedEnclosureChange(nextId: string) {
    setIsMobileMapOpen(true)
    workflowPanelsProps.onSelectedEnclosureChange(nextId)
  }

  return (
    <section className="space-y-4">
      <LivePositionStatusCard {...statusCardProps} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,420px)] lg:items-start">
        <div>
          <div className="space-y-3">
            <div className="lg:hidden">
              <div className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-950">Karte</h2>
                    <p className="text-sm text-neutral-700">{mobileMapSummary}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobileMapOpen((current) => !current)}
                    aria-expanded={isMobileMapOpen}
                    aria-label={isMobileMapOpen ? 'Karte schließen' : 'Karte öffnen'}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ccb98a] bg-[#fffdf6] text-lg font-semibold text-neutral-900 shadow-sm"
                  >
                    {isMobileMapOpen ? '−' : '+'}
                  </button>
                </div>
              </div>
            </div>

            <div
              aria-hidden={!isMobileMapOpen}
              className={[
                'overflow-hidden transition-all duration-200 ease-out',
                isMobileMapOpen
                  ? 'max-h-[100rem] opacity-100'
                  : 'pointer-events-none max-h-0 opacity-0',
                'lg:max-h-none lg:overflow-visible lg:opacity-100 lg:pointer-events-auto',
              ].join(' ')}
            >
              <LivePositionMapCanvasPanel {...canvasPanelProps} />
            </div>

            <div className="lg:hidden">
              <LivePositionWorkflowPanels
                {...workflowPanelsProps}
                onMobilePanelChange={handleMobilePanelChange}
                onSelectedEnclosureChange={handleSelectedEnclosureChange}
              />
            </div>
          </div>
        </div>

        <div>
          <LivePositionSidebarPanel
            {...sidebarPanelProps}
            onFocusEnclosure={handleFocusEnclosureFromSavedList}
            onStartEditEnclosure={handleStartEditEnclosureFromSavedList}
          />
        </div>
      </div>
    </section>
  )
}
