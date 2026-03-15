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
                    'min-h-[4.25rem] rounded-[1.35rem] border-2 px-4 py-3.5 text-left text-base font-semibold shadow-[0_12px_24px_rgba(40,34,26,0.08)] transition-colors',
                    isActive
                      ? 'border-[#3a342a] bg-[#efe4c8] text-[#17130f]'
                      : 'border-[#ccb98a] bg-[#fffdf6] text-neutral-800',
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
            <div className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-[#d2cbc0] bg-[#f8f1e2] px-3.5 py-3 text-[#17130f]">
              <button
                type="button"
                onClick={() => setMobileStep('section')}
                className="shrink-0 rounded-full border border-[#5a5347] bg-[#fffdf6] px-3 py-1.5 text-sm font-semibold text-[#17130f]"
              >
                Zurück
              </button>
              <div className="min-w-0 text-right">
                <div className="text-sm font-semibold">{activeSection.label}</div>
                <div className="mt-0.5 text-xs font-medium text-neutral-700">
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
                      'min-h-[4.5rem] rounded-[1.25rem] border-2 px-4 py-4 text-left text-base font-semibold shadow-[0_12px_24px_rgba(40,34,26,0.08)] transition-colors',
                      isActive
                        ? 'border-[#3a342a] bg-[#efe4c8] text-[#17130f]'
                        : 'border-[#ccb98a] bg-[#fffdf6] text-neutral-900',
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
                  'min-h-[4.25rem] rounded-[1.35rem] border-2 px-4 py-3.5 text-left text-base font-semibold shadow-[0_12px_24px_rgba(40,34,26,0.08)] transition-colors',
                  isActive
                    ? 'border-[#3a342a] bg-[#efe4c8] text-[#17130f]'
                    : 'border-[#ccb98a] bg-[#fffdf6] text-neutral-800',
                ].join(' ')}
                aria-pressed={isActive}
              >
                {section.label}
              </button>
            )
          })}
        </div>

        <div className="rounded-[1.1rem] border border-[#d2cbc0] bg-[#f8f1e2] px-4 py-3 text-sm text-[#17130f]">
          <div className="font-semibold">{activeSection.label}</div>
          <div className="mt-1 text-xs font-medium text-neutral-700">{activeSection.description}</div>
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
                  'min-h-[4.5rem] rounded-[1.25rem] border-2 px-4 py-4 text-left text-base font-semibold shadow-[0_12px_24px_rgba(40,34,26,0.08)] transition-colors',
                  isActive
                    ? 'border-[#3a342a] bg-[#efe4c8] text-[#17130f]'
                    : 'border-[#ccb98a] bg-[#fffdf6] text-neutral-900',
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
