'use client'

import { useState } from 'react'
import { formatArea } from '@/lib/maps/map-core'
import type { SurveyArea } from '@/types/domain'

type SurveyAreasPanelProps = {
  className?: string
  description: string
  safeSurveyAreas: SurveyArea[]
  selectedSurveyArea: SurveyArea | null
  selectedSurveyAreaId: string | null
  onFocusSurveyArea: (surveyArea: SurveyArea) => void
  formatUpdatedAt: (value: string) => string
}

export function SurveyAreasPanel({
  className = '',
  description,
  safeSurveyAreas,
  selectedSurveyArea,
  selectedSurveyAreaId,
  onFocusSurveyArea,
  formatUpdatedAt,
}: SurveyAreasPanelProps) {
  const [isMobileExpanded, setIsMobileExpanded] = useState(Boolean(selectedSurveyAreaId))

  return (
    <div
      className={`mx-auto w-full min-w-0 overflow-hidden rounded-[1.25rem] bg-[#fffdf6] px-3 py-3 sm:px-4 sm:py-4 ${className}`.trim()}
    >
      <button
        type="button"
        onClick={() => setIsMobileExpanded((current) => !current)}
        aria-expanded={isMobileExpanded}
        className="flex w-full min-w-0 items-start justify-between gap-3 overflow-hidden rounded-[1rem] border border-[#ccb98a] bg-[#fff8ea] px-3 py-3 text-left shadow-sm lg:hidden"
      >
        <div className="min-w-0 flex-1 overflow-hidden">
          <h2 className="text-base font-semibold text-neutral-950">Untersuchungsflächen</h2>
          {selectedSurveyArea ? (
            <div className="mt-1 min-w-0 text-xs text-neutral-700">
              <div className="font-medium text-neutral-800">Fokus</div>
              <div className="[overflow-wrap:anywhere]">{selectedSurveyArea.name}</div>
            </div>
          ) : (
            <div className="mt-1 text-xs text-neutral-700">
              {safeSurveyAreas.length} importierte Flächen
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 self-center">
          <span className="rounded-full border border-[#ccb98a] bg-[#fffdf6] px-2 py-1 text-[11px] font-semibold text-neutral-900">
            {safeSurveyAreas.length}
          </span>
          <span className="text-lg font-semibold text-neutral-900">
            {isMobileExpanded ? '−' : '+'}
          </span>
        </div>
      </button>

      <div className="hidden items-center justify-between gap-3 lg:flex">
        <h2 className="text-lg font-semibold text-neutral-950">Untersuchungsflächen</h2>
        <span className="text-sm text-neutral-500">{safeSurveyAreas.length}</span>
      </div>

      <div className={[isMobileExpanded ? 'mt-3 block' : 'hidden', 'lg:mt-2 lg:block'].join(' ')}>
        <p className="text-sm text-neutral-700 break-words">{description}</p>

        {safeSurveyAreas.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-600">Noch keine Untersuchungsflächen importiert.</p>
        ) : (
          <div className="mt-3 w-full min-w-0 overflow-visible lg:max-h-64 lg:overflow-x-hidden lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
            <div className="w-full min-w-0 space-y-2">
              {selectedSurveyArea ? (
                <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-[#d2cbc0] bg-[#efe4c8] px-3 py-2 text-sm text-[#17130f]">
                  <div className="text-xs font-semibold uppercase tracking-[0.04em] text-neutral-700">
                    Fokus
                  </div>
                  <div className="font-medium [overflow-wrap:anywhere]">{selectedSurveyArea.name}</div>
                  <div className="mt-1 text-xs text-neutral-700">
                    {formatArea(selectedSurveyArea.areaM2)}
                  </div>
                  <div className="mt-1 text-xs text-neutral-600 break-all font-mono">
                    ID: {selectedSurveyArea.id}
                  </div>
                </div>
              ) : null}

              {safeSurveyAreas.map((surveyArea) => (
                <div
                  key={surveyArea.id}
                  className={[
                    'w-full min-w-0 max-w-full overflow-hidden rounded-xl border px-3 py-2.5',
                    selectedSurveyAreaId === surveyArea.id
                      ? 'border-[#d2cbc0] bg-[#efe4c8]'
                      : 'border-[#ccb98a] bg-[#fffdf6]',
                  ].join(' ')}
                >
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-neutral-900 [overflow-wrap:anywhere]">
                        {surveyArea.name}
                      </div>
                      <div className="mt-1 text-[11px] text-neutral-600">
                        {formatArea(surveyArea.areaM2)}
                      </div>
                      <div className="mt-0.5 text-[11px] text-neutral-600 [overflow-wrap:anywhere]">
                        {formatUpdatedAt(surveyArea.updatedAt)}
                      </div>
                      <div className="mt-1 text-[10px] font-mono text-neutral-500 break-all">
                        ID: {surveyArea.id}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileExpanded(true)
                        onFocusSurveyArea(surveyArea)
                      }}
                      className="w-full rounded-full border border-[#ccb98a] bg-[#fffdf6] px-2.5 py-1.5 text-[11px] font-semibold text-neutral-950 shadow-sm sm:w-auto sm:shrink-0"
                    >
                      Fokus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
