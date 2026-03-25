'use client'

import { WorkActiveSessionPanel } from '@/components/work/work-active-session-panel'
import { WorkNewSessionForm } from '@/components/work/work-new-session-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorAlert, StatusAlert } from '@/components/ui/alert'
import type { WorkActivityId, Enclosure, Herd, WorkSession, WorkStatus, WorkType } from '@/types/domain'
import type { WorkPickerSectionId, WorkSelection } from '@/lib/work/work-session-helpers'

type WorkSessionControlCardProps = {
  activeSession: WorkSession | null
  nextReminderMs: number | null
  nowMs: number
  herdsById: Map<string, Herd>
  enclosuresById: Map<string, Enclosure>
  herds: Herd[]
  enclosures: Enclosure[]
  isSaving: boolean
  workPickerSectionId: WorkPickerSectionId
  workType: WorkType
  workActivityId: WorkActivityId | null
  selectedHerdId: string
  selectedEnclosureId: string
  reminderIntervalMin: string
  notes: string
  error: string
  statusMessage: string
  onStartWorkSession: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>
  onUpdateWorkSessionStatus: (status: WorkStatus) => void | Promise<void>
  onWorkPickerSectionChange: (value: WorkPickerSectionId) => void
  onWorkSelectionChange: (value: WorkSelection) => void
  onSelectedHerdIdChange: (value: string) => void
  onSelectedEnclosureIdChange: (value: string) => void
  onReminderIntervalMinChange: (value: string) => void
  onNotesChange: (value: string) => void
}

export function WorkSessionControlCard({
  activeSession,
  nextReminderMs,
  nowMs,
  herdsById,
  enclosuresById,
  herds,
  enclosures,
  isSaving,
  workPickerSectionId,
  workType,
  workActivityId,
  selectedHerdId,
  selectedEnclosureId,
  reminderIntervalMin,
  notes,
  error,
  statusMessage,
  onStartWorkSession,
  onUpdateWorkSessionStatus,
  onWorkPickerSectionChange,
  onWorkSelectionChange,
  onSelectedHerdIdChange,
  onSelectedEnclosureIdChange,
  onReminderIntervalMinChange,
  onNotesChange,
}: WorkSessionControlCardProps) {
  return (
    <Card data-work-session-control-card="true">
      <CardHeader>
        <CardTitle>Neuer Arbeitseinsatz</CardTitle>
      </CardHeader>

      <CardContent>
        {activeSession ? (
          <WorkActiveSessionPanel
            activeSession={activeSession}
            nextReminderMs={nextReminderMs}
            nowMs={nowMs}
            herdsById={herdsById}
            enclosuresById={enclosuresById}
            isSaving={isSaving}
            onUpdateStatus={onUpdateWorkSessionStatus}
          />
        ) : (
          <WorkNewSessionForm
            isSaving={isSaving}
            workPickerSectionId={workPickerSectionId}
            workType={workType}
            workActivityId={workActivityId}
            selectedHerdId={selectedHerdId}
            selectedEnclosureId={selectedEnclosureId}
            reminderIntervalMin={reminderIntervalMin}
            notes={notes}
            herds={herds}
            enclosures={enclosures}
            onSubmit={onStartWorkSession}
            onWorkPickerSectionChange={onWorkPickerSectionChange}
            onWorkSelectionChange={onWorkSelectionChange}
            onSelectedHerdIdChange={onSelectedHerdIdChange}
            onSelectedEnclosureIdChange={onSelectedEnclosureIdChange}
            onReminderIntervalMinChange={onReminderIntervalMinChange}
            onNotesChange={onNotesChange}
          />
        )}

        {error ? (
          <ErrorAlert className="mt-4">
            {error}
          </ErrorAlert>
        ) : null}

        {statusMessage ? (
          <StatusAlert className="mt-4">
            {statusMessage}
          </StatusAlert>
        ) : null}
      </CardContent>
    </Card>
  )
}
