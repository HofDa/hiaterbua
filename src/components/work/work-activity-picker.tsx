'use client'

import { useState } from 'react'
import {
  getDefaultWorkSelectionForSection,
  getWorkPickerSection,
  getWorkSelection,
  getWorkSelectionForOption,
  workPickerSections,
  type WorkSelection,
  type WorkPickerSectionId,
} from '@/lib/work/work-session-helpers'
import type { WorkActivityId, WorkType } from '@/types/domain'

type WorkActivityPickerProps = {
  sectionId: WorkPickerSectionId
  workType: WorkType
  activityId: WorkActivityId | null
  initialMobileStep?: 'section' | 'option'
  onSectionChange: (sectionId: WorkPickerSectionId) => void
  onSelectionChange: (selection: WorkSelection) => void
}

export function WorkActivityPicker({
  sectionId,
  workType,
  activityId,
  initialMobileStep = 'section',
  onSectionChange,
  onSelectionChange,
}: WorkActivityPickerProps) {
  const activeSection = getWorkPickerSection(sectionId)
  const selectedOptionId = getWorkSelection({ type: workType, activityId }).activityId
  const [mobileStep, setMobileStep] = useState<'section' | 'option'>(initialMobileStep)

  return (
    <div className="space-y-3">
      <div className="space-y-3 sm:hidden">
        {mobileStep === 'section' ? (
          <div className="grid gap-3">
            {workPickerSections.map((section) => {
              const isActive = section.id === sectionId

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    onSectionChange(section.id)
                    onSelectionChange(getDefaultWorkSelectionForSection(section.id))
                    setMobileStep('option')
                  }}
                  className={[
                    'min-h-[4.25rem] rounded-[1.35rem] border-2 px-4 py-3.5 text-left text-base font-semibold app-shadow-action transition-colors',
                    isActive
                      ? 'border-border-ink bg-accent text-ink'
                      : 'border-border bg-surface-raised text-ink-soft',
                  ].join(' ')}
                  aria-pressed={isActive}
                >
                  {section.label}
                </button>
              )
            })}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 app-callout px-3.5 py-3">
              <button
                type="button"
                onClick={() => setMobileStep('section')}
                className="shrink-0 rounded-full border border-border-strong bg-surface-raised px-3 py-1.5 text-sm font-semibold text-ink"
              >
                Zurück
              </button>
              <div className="min-w-0 text-right">
                <div className="text-sm font-semibold">{activeSection.label}</div>
                <div className="mt-0.5 text-xs font-medium text-ink-muted">
                  {activeSection.description}
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {activeSection.options.map((option) => {
                const isActive = option.id === selectedOptionId

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onSelectionChange(getWorkSelectionForOption(sectionId, option.id))}
                    className={[
                      'min-h-[4.5rem] rounded-[1.25rem] border-2 px-4 py-4 text-left text-base font-semibold app-shadow-action transition-colors',
                      isActive
                        ? 'border-border-ink bg-accent text-ink'
                        : 'border-border bg-surface-raised text-ink',
                    ].join(' ')}
                    aria-pressed={isActive}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      <div className="hidden space-y-3 sm:block">
        <div className="grid gap-3 sm:grid-cols-3">
          {workPickerSections.map((section) => {
            const isActive = section.id === sectionId

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  onSectionChange(section.id)
                  onSelectionChange(getDefaultWorkSelectionForSection(section.id))
                }}
                className={[
                  'min-h-[4.25rem] rounded-[1.35rem] border-2 px-4 py-3.5 text-left text-base font-semibold app-shadow-action transition-colors',
                  isActive
                    ? 'border-border-ink bg-accent text-ink'
                    : 'border-border bg-surface-raised text-ink-soft',
                ].join(' ')}
                aria-pressed={isActive}
              >
                {section.label}
              </button>
            )
          })}
        </div>

        <div className="rounded-[1.1rem] border border-border-soft bg-surface-warm px-4 py-3 text-sm text-ink">
          <div className="font-semibold">{activeSection.label}</div>
          <div className="mt-1 text-xs font-medium text-ink-muted">{activeSection.description}</div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {activeSection.options.map((option) => {
            const isActive = option.id === selectedOptionId

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectionChange(getWorkSelectionForOption(sectionId, option.id))}
                className={[
                  'min-h-[4.5rem] rounded-[1.25rem] border-2 px-4 py-4 text-left text-base font-semibold app-shadow-action transition-colors',
                  isActive
                    ? 'border-border-ink bg-accent text-ink'
                    : 'border-border bg-surface-raised text-ink',
                ].join(' ')}
                aria-pressed={isActive}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
