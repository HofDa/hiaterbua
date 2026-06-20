'use client'

import { useState } from 'react'
import { formatArea } from '@/lib/maps/map-core'
import { FormButton } from '@/components/ui/form'
import { Alert } from '@/components/ui/alert'
import { CollapseChevron } from '@/components/ui/collapse-chevron'
import { MetaLabel } from '@/components/ui/typography'
import { cn } from '@/lib/utils/cn'
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
    // No card chrome here: this panel is always rendered inside an `app-panel`,
    // so wrapping it in another Card just produces a redundant card-in-card.
    <div className={cn('w-full min-w-0 overflow-hidden', className)}>
      <FormButton
        type="button"
        onClick={() => setIsMobileExpanded((current) => !current)}
        aria-expanded={isMobileExpanded}
        variant="secondary"
        className="flex w-full min-w-0 items-start justify-between gap-3 overflow-hidden rounded-[1rem] px-3 py-3 text-left lg:hidden"
      >
        <div className="min-w-0 flex-1 overflow-hidden">
          <h2 className="text-base font-semibold text-ink-strong">Untersuchungsflächen</h2>
          {selectedSurveyArea ? (
            <div className="mt-1 min-w-0 text-xs text-ink-muted">
              <div className="font-medium text-ink-soft">Fokus</div>
              <div className="[overflow-wrap:anywhere]">{selectedSurveyArea.name}</div>
            </div>
          ) : (
            <div className="mt-1 text-xs text-ink-muted">
              {safeSurveyAreas.length} importierte Flächen
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 self-center">
          <span className="rounded-full border border-border bg-surface-raised px-2 py-1 text-[11px] font-semibold text-ink">
            {safeSurveyAreas.length}
          </span>
          <CollapseChevron open={isMobileExpanded} />
        </div>
      </FormButton>

      <div className="hidden items-center justify-between gap-3 lg:flex">
        <h2 className="text-lg font-semibold text-ink-strong">Untersuchungsflächen</h2>
        <span className="text-sm text-ink-soft">{safeSurveyAreas.length}</span>
      </div>

      <div className={cn(isMobileExpanded ? 'mt-3 block' : 'hidden', 'lg:mt-2 lg:block')}>
        <p className="text-sm text-ink-muted break-words">{description}</p>

        {safeSurveyAreas.length === 0 ? (
          <Alert variant="info" className="mt-3 text-sm text-ink-muted">
            Noch keine Untersuchungsflächen importiert.
          </Alert>
        ) : (
          <div className="mt-3 w-full min-w-0 overflow-visible lg:max-h-64 lg:overflow-x-hidden lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
            <div className="w-full min-w-0 space-y-2">
              {selectedSurveyArea ? (
                <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-border-soft bg-accent px-3 py-2 text-sm text-ink">
                  <MetaLabel tracking="tight">
                    Fokus
                  </MetaLabel>
                  <div className="font-medium [overflow-wrap:anywhere]">{selectedSurveyArea.name}</div>
                  <div className="mt-1 text-xs text-ink-muted">
                    {formatArea(selectedSurveyArea.areaM2)}
                  </div>
                  <div className="mt-1 text-xs text-ink-muted break-all font-mono">
                    ID: {selectedSurveyArea.id}
                  </div>
                </div>
              ) : null}

              {safeSurveyAreas.map((surveyArea) => (
                <div
                  key={surveyArea.id}
                  className={cn(
                    'w-full min-w-0 max-w-full overflow-hidden rounded-xl border px-3 py-2.5',
                    selectedSurveyAreaId === surveyArea.id
                      ? 'border-border-soft bg-accent'
                      : 'border-border bg-surface-raised',
                  )}
                >
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-ink [overflow-wrap:anywhere]">
                        {surveyArea.name}
                      </div>
                      <div className="mt-1 text-[11px] text-ink-muted">
                        {formatArea(surveyArea.areaM2)}
                      </div>
                      <div className="mt-0.5 text-[11px] text-ink-muted [overflow-wrap:anywhere]">
                        {formatUpdatedAt(surveyArea.updatedAt)}
                      </div>
                      <div className="mt-1 text-[10px] font-mono text-ink-soft break-all">
                        ID: {surveyArea.id}
                      </div>
                    </div>
                    <FormButton
                      type="button"
                      onClick={() => {
                        setIsMobileExpanded(true)
                        onFocusSurveyArea(surveyArea)
                      }}
                      variant="secondary"
                      className="w-full rounded-full px-2.5 py-1.5 text-[11px] font-semibold sm:w-auto sm:shrink-0"
                    >
                      Fokus
                    </FormButton>
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
