'use client'

import { WorkActivityPicker } from '@/components/work/work-activity-picker'
import {
  getWorkStatusLabel,
  reminderOptions,
  type WorkPickerSectionId,
  type WorkSelection,
} from '@/lib/work/work-session-helpers'
import type { Enclosure, Herd, WorkActivityId, WorkStatus, WorkType } from '@/types/domain'

type WorkSessionEditFormProps = {
  isSaving: boolean
  status: WorkStatus
  editWorkPickerSectionId: WorkPickerSectionId
  editWorkType: WorkType
  editWorkActivityId: WorkActivityId | null
  editSelectedHerdId: string
  editSelectedEnclosureId: string
  editReminderIntervalMin: string
  editStartTime: string
  editEndTime: string
  editNotes: string
  errorMessage: string
  herds: Herd[]
  enclosures: Enclosure[]
  onEditWorkPickerSectionChange: (value: WorkPickerSectionId) => void
  onEditWorkSelectionChange: (value: WorkSelection) => void
  onEditSelectedHerdIdChange: (value: string) => void
  onEditSelectedEnclosureIdChange: (value: string) => void
  onEditReminderIntervalMinChange: (value: string) => void
  onEditStartTimeChange: (value: string) => void
  onEditEndTimeChange: (value: string) => void
  onEditNotesChange: (value: string) => void
  onSave: () => void | Promise<void>
  onCancel: () => void
}

export function WorkSessionEditForm({
  isSaving,
  status,
  editWorkPickerSectionId,
  editWorkType,
  editWorkActivityId,
  editSelectedHerdId,
  editSelectedEnclosureId,
  editReminderIntervalMin,
  editStartTime,
  editEndTime,
  editNotes,
  errorMessage,
  herds,
  enclosures,
  onEditWorkPickerSectionChange,
  onEditWorkSelectionChange,
  onEditSelectedHerdIdChange,
  onEditSelectedEnclosureIdChange,
  onEditReminderIntervalMinChange,
  onEditStartTimeChange,
  onEditEndTimeChange,
  onEditNotesChange,
  onSave,
  onCancel,
}: WorkSessionEditFormProps) {
  return (
    <div className="mt-4 space-y-4 rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-4">
      <div className="rounded-[1rem] border border-[#d2cbc0] bg-[#efe4c8] px-4 py-3 text-sm text-[#17130f]">
        Status aktuell: <span className="font-semibold">{getWorkStatusLabel(status)}</span>. Ende
        leer lassen fuer laufende oder pausierte Einsaetze. Sobald ein Ende gesetzt ist, wird der
        Einsatz als beendet gespeichert.
      </div>

      {errorMessage ? (
        <div className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {errorMessage}
        </div>
      ) : null}

      <div className="space-y-4">
        <WorkActivityPicker
          sectionId={editWorkPickerSectionId}
          workType={editWorkType}
          activityId={editWorkActivityId}
          initialMobileStep="option"
          onSectionChange={onEditWorkPickerSectionChange}
          onSelectionChange={onEditWorkSelectionChange}
        />

        <div>
          <label className="mb-1 block text-sm font-medium">Erinnerung</label>
          <select
            className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
            value={editReminderIntervalMin}
            onChange={(event) => onEditReminderIntervalMinChange(event.target.value)}
          >
            {reminderOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Herde</label>
          <select
            className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
            value={editSelectedHerdId}
            onChange={(event) => onEditSelectedHerdIdChange(event.target.value)}
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
            value={editSelectedEnclosureId}
            onChange={(event) => onEditSelectedEnclosureIdChange(event.target.value)}
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

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Beginn</label>
          <input
            type="datetime-local"
            step={60}
            className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
            value={editStartTime}
            onChange={(event) => onEditStartTimeChange(event.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Ende</label>
          <input
            type="datetime-local"
            step={60}
            className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
            value={editEndTime}
            onChange={(event) => onEditEndTimeChange(event.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Notiz</label>
        <textarea
          className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
          rows={3}
          value={editNotes}
          onChange={(event) => onEditNotesChange(event.target.value)}
          placeholder="optionale Bemerkung zum Einsatz"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={isSaving}
          className="rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-3 text-sm font-semibold text-[#17130f] disabled:opacity-50"
        >
          {isSaving ? 'Speichert ...' : 'Änderungen speichern'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-neutral-950"
        >
          Abbrechen
        </button>
      </div>
    </div>
  )
}
