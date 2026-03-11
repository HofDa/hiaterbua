'use client'

import { WorkActiveSessionPanel } from '@/components/work/work-active-session-panel'
import { WorkNewSessionForm } from '@/components/work/work-new-session-form'
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
    <div className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
      <h2 className="text-lg font-semibold tracking-[-0.02em]">Neuer Arbeitseinsatz</h2>

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
        <div className="mt-4 rounded-[1.1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </div>
      ) : null}

      {statusMessage ? (
        <div className="mt-4 rounded-[1.1rem] border border-[#c5d3c8] bg-[#edf1ec] px-4 py-3 text-sm font-semibold text-[#243228]">
          {statusMessage}
        </div>
      ) : null}
    </div>
  )
}
