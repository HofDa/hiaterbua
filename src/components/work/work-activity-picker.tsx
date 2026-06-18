'use client'

import { useState } from 'react'
import {
  FlowOptionGrid,
  FlowSelectableTile,
  FlowStepHeader,
} from '@/components/ui/mobile-flow'
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

const workSectionSelectedClass = 'border-border-ink bg-accent text-ink'
const workSectionIdleClass = 'border-border bg-surface-raised text-ink-soft'
const workOptionSelectedClass = 'border-border-ink bg-accent text-ink'
const workOptionIdleClass = 'border-border bg-surface-raised text-ink'

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
          <FlowOptionGrid layout="single">
            {workPickerSections.map((section) => {
              const isActive = section.id === sectionId

              return (
                <FlowSelectableTile
                  key={section.id}
                  onClick={() => {
                    onSectionChange(section.id)
                    onSelectionChange(getDefaultWorkSelectionForSection(section.id))
                    setMobileStep('option')
                  }}
                  pressed={isActive}
                  selectedClassName={workSectionSelectedClass}
                  idleClassName={workSectionIdleClass}
                  className="rounded-[1.35rem] text-base leading-normal"
                >
                  {section.label}
                </FlowSelectableTile>
              )
            })}
          </FlowOptionGrid>
        ) : (
          <>
            <FlowStepHeader
              label={activeSection.label}
              sublabel={activeSection.description}
              onBack={() => setMobileStep('section')}
              labelClassName="leading-normal"
              sublabelClassName="leading-normal"
            />

            <FlowOptionGrid layout="single">
              {activeSection.options.map((option) => {
                const isActive = option.id === selectedOptionId

                return (
                  <FlowSelectableTile
                    key={option.id}
                    onClick={() => onSelectionChange(getWorkSelectionForOption(sectionId, option.id))}
                    pressed={isActive}
                    selectedClassName={workOptionSelectedClass}
                    idleClassName={workOptionIdleClass}
                    className="min-h-[4.5rem] px-4 py-4 text-base leading-normal"
                  >
                    {option.label}
                  </FlowSelectableTile>
                )
              })}
            </FlowOptionGrid>
          </>
        )}
      </div>

      <div className="hidden space-y-3 sm:block">
        <div className="grid gap-3 sm:grid-cols-3">
          {workPickerSections.map((section) => {
            const isActive = section.id === sectionId

            return (
              <FlowSelectableTile
                key={section.id}
                onClick={() => {
                  onSectionChange(section.id)
                  onSelectionChange(getDefaultWorkSelectionForSection(section.id))
                }}
                pressed={isActive}
                selectedClassName={workSectionSelectedClass}
                idleClassName={workSectionIdleClass}
                className="rounded-[1.35rem] text-base leading-normal"
              >
                {section.label}
              </FlowSelectableTile>
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
              <FlowSelectableTile
                key={option.id}
                onClick={() => onSelectionChange(getWorkSelectionForOption(sectionId, option.id))}
                pressed={isActive}
                selectedClassName={workOptionSelectedClass}
                idleClassName={workOptionIdleClass}
                className="min-h-[4.5rem] px-4 py-4 text-base leading-normal"
              >
                {option.label}
              </FlowSelectableTile>
            )
          })}
        </div>
      </div>
    </div>
  )
}
