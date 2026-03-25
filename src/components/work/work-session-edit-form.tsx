'use client'

import { WorkActivityPicker } from '@/components/work/work-activity-picker'
import {
  getWorkStatusLabel,
  reminderOptions,
  type WorkPickerSectionId,
  type WorkSelection,
} from '@/lib/work/work-session-helpers'
import type { Enclosure, Herd, WorkActivityId, WorkStatus, WorkType } from '@/types/domain'
import { Card, CardContent } from '@/components/ui/card'
import { FormField, FormLabel, FormSelect, FormInput, FormTextarea, FormButton } from '@/components/ui/form'
import { Alert, ErrorAlert } from '@/components/ui/alert'

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
    <Card className="mt-4 space-y-4">
      <CardContent>
        <Alert className="rounded-[1rem] border border-[#d2cbc0] bg-[#efe4c8] text-sm text-[#17130f]">
          Status aktuell: <span className="font-semibold">{getWorkStatusLabel(status)}</span>. Ende
          leer lassen fuer laufende oder pausierte Einsaetze. Sobald ein Ende gesetzt ist, wird der
          Einsatz als beendet gespeichert.
        </Alert>

        {errorMessage && (
          <ErrorAlert>{errorMessage}</ErrorAlert>
        )}

        <WorkActivityPicker
          sectionId={editWorkPickerSectionId}
          workType={editWorkType}
          activityId={editWorkActivityId}
          onSectionChange={onEditWorkPickerSectionChange}
          onSelectionChange={onEditWorkSelectionChange}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField>
            <FormLabel>Erinnerung</FormLabel>
            <FormSelect
              value={editReminderIntervalMin}
              onChange={(event) => onEditReminderIntervalMinChange(event.target.value)}
            >
              {reminderOptions.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField>
            <FormLabel>Herde</FormLabel>
            <FormSelect
              value={editSelectedHerdId}
              onChange={(event) => onEditSelectedHerdIdChange(event.target.value)}
            >
              <option value="">Keine Herde</option>
              {herds.map((herd) => (
                <option key={herd.id} value={herd.id}>
                  {herd.name}
                </option>
              ))}
            </FormSelect>
          </FormField>
        </div>

        <FormField>
          <FormLabel>Pferch</FormLabel>
          <FormSelect
            value={editSelectedEnclosureId}
            onChange={(event) => onEditSelectedEnclosureIdChange(event.target.value)}
          >
            <option value="">Kein Pferch</option>
            {enclosures.map((enclosure) => (
              <option key={enclosure.id} value={enclosure.id}>
                {enclosure.name}
              </option>
            ))}
          </FormSelect>
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField>
            <FormLabel>Beginn</FormLabel>
            <FormInput
              type="datetime-local"
              step={60}
              value={editStartTime}
              onChange={(event) => onEditStartTimeChange(event.target.value)}
            />
          </FormField>

          <FormField>
            <FormLabel>Ende</FormLabel>
            <FormInput
              type="datetime-local"
              step={60}
              value={editEndTime}
              onChange={(event) => onEditEndTimeChange(event.target.value)}
            />
          </FormField>
        </div>

        <FormField>
          <FormLabel>Notiz</FormLabel>
          <FormTextarea
            rows={3}
            value={editNotes}
            onChange={(event) => onEditNotesChange(event.target.value)}
          />
        </FormField>

        <div className="flex gap-2">
          <FormButton
            type="button"
            onClick={() => void onSave()}
            disabled={isSaving}
            variant="primary"
          >
            {isSaving ? 'Speichert ...' : 'Änderungen speichern'}
          </FormButton>
          <FormButton
            type="button"
            onClick={onCancel}
            variant="secondary"
          >
            Abbrechen
          </FormButton>
        </div>
      </CardContent>
    </Card>
  )
}
