'use client'

import type { FormEventHandler } from 'react'
import { WorkActivityPicker } from '@/components/work/work-activity-picker'
import {
  reminderOptions,
  type WorkPickerSectionId,
  type WorkSelection,
} from '@/lib/work/work-session-helpers'
import type { Enclosure, Herd, WorkActivityId, WorkType } from '@/types/domain'

type WorkNewSessionFormProps = {
  isSaving: boolean
  workPickerSectionId: WorkPickerSectionId
  workType: WorkType
  workActivityId: WorkActivityId | null
  selectedHerdId: string
  selectedEnclosureId: string
  reminderIntervalMin: string
  notes: string
  herds: Herd[]
  enclosures: Enclosure[]
  onSubmit: FormEventHandler<HTMLFormElement>
  onWorkPickerSectionChange: (value: WorkPickerSectionId) => void
  onWorkSelectionChange: (value: WorkSelection) => void
  onSelectedHerdIdChange: (value: string) => void
  onSelectedEnclosureIdChange: (value: string) => void
  onReminderIntervalMinChange: (value: string) => void
  onNotesChange: (value: string) => void
}

export function WorkNewSessionForm({
  isSaving,
  workPickerSectionId,
  workType,
  workActivityId,
  selectedHerdId,
  selectedEnclosureId,
  reminderIntervalMin,
  notes,
  herds,
  enclosures,
  onSubmit,
  onWorkPickerSectionChange,
  onWorkSelectionChange,
  onSelectedHerdIdChange,
  onSelectedEnclosureIdChange,
  onReminderIntervalMinChange,
  onNotesChange,
}: WorkNewSessionFormProps) {
  return (
    <form className="mt-4 space-y-4" onSubmit={onSubmit}>
      <WorkActivityPicker
        sectionId={workPickerSectionId}
        workType={workType}
        activityId={workActivityId}
        onSectionChange={onWorkPickerSectionChange}
        onSelectionChange={onWorkSelectionChange}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Herde</label>
          <select
            className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
            value={selectedHerdId}
            onChange={(event) => onSelectedHerdIdChange(event.target.value)}
          >
            <option value="">Keine Zuordnung</option>
            {herds
              .filter((herd) => !herd.isArchived)
              .map((herd) => (
                <option key={herd.id} value={herd.id}>
                  {herd.name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Pferch</label>
          <select
            className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
            value={selectedEnclosureId}
            onChange={(event) => onSelectedEnclosureIdChange(event.target.value)}
          >
            <option value="">Keine Zuordnung</option>
            {enclosures.map((enclosure) => (
              <option key={enclosure.id} value={enclosure.id}>
                {enclosure.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Notiz</label>
        <textarea
          className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
          rows={3}
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="optionale Bemerkung zum Einsatz"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Erinnerung</label>
        <select
          className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
          value={reminderIntervalMin}
          onChange={(event) => onReminderIntervalMinChange(event.target.value)}
        >
          {reminderOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs font-medium text-neutral-700">
          Funktioniert als leichte In-App-Erinnerung, solange die App offen ist.
        </p>
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="w-full rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-4 font-semibold text-[#17130f] shadow-[0_12px_24px_rgba(40,34,26,0.08)] disabled:opacity-50"
      >
        {isSaving ? 'Startet ...' : 'Arbeitseinsatz starten'}
      </button>
    </form>
  )
}
