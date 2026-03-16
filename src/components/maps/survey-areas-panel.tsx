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
      className={`min-w-0 overflow-hidden rounded-[1.25rem] bg-[#fffdf6] px-3 py-3 sm:px-4 sm:py-4 ${className}`.trim()}
    >
      <button
        type="button"
        onClick={() => setIsMobileExpanded((current) => !current)}
        aria-expanded={isMobileExpanded}
        className="flex w-full items-center justify-between gap-3 rounded-[1rem] border border-[#ccb98a] bg-[#fff8ea] px-3 py-3 text-left shadow-sm lg:hidden"
      >
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-neutral-950">Untersuchungsflächen</h2>
          <div className="mt-1 truncate text-xs text-neutral-700">
            {selectedSurveyArea
              ? `Fokus: ${selectedSurveyArea.name}`
              : `${safeSurveyAreas.length} importierte Flächen`}
          </div>
        </div>
        <div className="flex items-center gap-2">
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
        <p className="text-sm text-neutral-700">{description}</p>

        {selectedSurveyArea ? (
          <div className="mt-3 rounded-xl border border-[#d2cbc0] bg-[#efe4c8] px-3 py-2 text-sm text-[#17130f]">
            Fokus: <span className="font-medium">{selectedSurveyArea.name}</span> ·{' '}
            {formatArea(selectedSurveyArea.areaM2)}
          </div>
        ) : null}

        {safeSurveyAreas.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-600">Noch keine Untersuchungsflächen importiert.</p>
        ) : (
          <div className="mt-3 max-h-52 overflow-x-hidden overflow-y-auto overscroll-contain pr-1 sm:max-h-60 lg:max-h-64">
            <div className="space-y-2">
              {safeSurveyAreas.map((surveyArea) => (
                <div
                  key={surveyArea.id}
                  className={[
                    'w-full rounded-xl border px-3 py-2.5',
                    selectedSurveyAreaId === surveyArea.id
                      ? 'border-[#d2cbc0] bg-[#efe4c8]'
                      : 'border-[#ccb98a] bg-[#fffdf6]',
                  ].join(' ')}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-neutral-900 break-words">
                        {surveyArea.name}
                      </div>
                      <div className="mt-1 text-[11px] text-neutral-600">
                        {formatArea(surveyArea.areaM2)} · {formatUpdatedAt(surveyArea.updatedAt)}
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
