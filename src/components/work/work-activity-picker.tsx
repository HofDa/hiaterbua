'use client'

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
  onSectionChange: (sectionId: WorkPickerSectionId) => void
  onSelectionChange: (selection: WorkSelection) => void
}

export function WorkActivityPicker({
  sectionId,
  workType,
  activityId,
  onSectionChange,
  onSelectionChange,
}: WorkActivityPickerProps) {
  const activeSection = getWorkPickerSection(sectionId)
  const selectedOptionId = getWorkSelection({ type: workType, activityId }).activityId

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium">Arbeit</label>
        <p className="text-xs font-medium text-neutral-700">
          Bereich wählen und dann die konkrete Tätigkeit antippen.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
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
                'rounded-full border px-4 py-2 text-left text-sm font-semibold transition-colors',
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

      <div className="grid gap-2 sm:grid-cols-2">
        {activeSection.options.map((option) => {
          const isActive = option.id === selectedOptionId

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectionChange(getWorkSelectionForOption(sectionId, option.id))}
              className={[
                'min-h-14 rounded-[1rem] border px-4 py-3 text-left text-sm font-medium shadow-sm transition-colors',
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
  )
}
