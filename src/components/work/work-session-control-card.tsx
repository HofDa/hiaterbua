'use client'

import { WorkActiveSessionPanel } from '@/components/work/work-active-session-panel'
import { WorkNewSessionForm } from '@/components/work/work-new-session-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorAlert, StatusAlert } from '@/components/ui/alert'
import { SavedSummaryCard } from '@/components/ui/saved-summary-card'
import type { LastFinishedWork } from '@/components/work/hooks/use-work-page-controller/use-work-page-session-actions'
import { formatDurationWords } from '@/lib/maps/grazing-session-map-helpers'
import { getWorkLabel } from '@/lib/work/work-session-helpers'
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
  lastFinishedWork: LastFinishedWork | null
  lastWorkForRepeat: WorkSession | null
  onStartLikeLast: (last: WorkSession) => void | Promise<void>
  onUndoFinishWork: () => void | Promise<void>
  onDismissFinishedWork: () => void
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
  lastFinishedWork,
  lastWorkForRepeat,
  onStartLikeLast,
  onUndoFinishWork,
  onDismissFinishedWork,
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
      {/* Card already carries p-5; the CardHeader/CardContent p-6 defaults on
          top of it would double the padding and blow the card up on mobile. */}
      {/* The summary closes the session that just ended, above the next one. */}
      {!activeSession && lastFinishedWork ? (
        <div className="mb-5">
          <SavedSummaryCard
            title="Arbeitseinsatz gespeichert"
            subtitle={lastFinishedWork.label}
            stats={[
              { label: 'Dauer', value: formatDurationWords(lastFinishedWork.durationS) },
              {
                label: 'Herde',
                value: lastFinishedWork.herdId
                  ? (herdsById.get(lastFinishedWork.herdId)?.name ?? '–')
                  : '–',
              },
            ]}
            savedAt={lastFinishedWork.finishedAt}
            undoLabel="Rückgängig – weiterlaufen lassen"
            isBusy={isSaving}
            onUndo={onUndoFinishWork}
            onDismiss={onDismissFinishedWork}
          />
        </div>
      ) : null}
      <CardHeader className="p-0">
        <CardTitle className="text-xl">
          {activeSession ? 'Laufender Arbeitseinsatz' : 'Neuer Arbeitseinsatz'}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
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
            repeat={
              lastWorkForRepeat
                ? {
                    label: getWorkLabel(lastWorkForRepeat),
                    onStart: () => onStartLikeLast(lastWorkForRepeat),
                  }
                : null
            }
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
