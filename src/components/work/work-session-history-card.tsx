'use client'

import {
  formatDateTime,
  formatDuration,
  getLiveDurationS,
  getWorkLabel,
  getWorkStatusLabel,
} from '@/lib/work/work-session-helpers'
import { WorkSessionEditForm } from '@/components/work/work-session-edit-form'
import type { WorkPickerSectionId, WorkSelection } from '@/lib/work/work-session-helpers'
import type { Enclosure, Herd, WorkActivityId, WorkSession, WorkType } from '@/types/domain'

type WorkSessionHistoryCardProps = {
  sessions: WorkSession[]
  nowMs: number
  isSaving: boolean
  editingSessionId: string | null
  herdsById: Map<string, Herd>
  enclosuresById: Map<string, Enclosure>
  herds: Herd[]
  enclosures: Enclosure[]
  editWorkPickerSectionId: WorkPickerSectionId
  editWorkType: WorkType
  editWorkActivityId: WorkActivityId | null
  editSelectedHerdId: string
  editSelectedEnclosureId: string
  editReminderIntervalMin: string
  editStartTime: string
  editEndTime: string
  editNotes: string
  error: string
  onStartEditingSession: (session: WorkSession) => void
  onCancelEditingSession: () => void
  onDeleteWorkSession: (session: WorkSession) => void | Promise<void>
  onSaveEditedSession: (sessionId: string) => void | Promise<void>
  onEditWorkPickerSectionChange: (value: WorkPickerSectionId) => void
  onEditWorkSelectionChange: (value: WorkSelection) => void
  onEditSelectedHerdIdChange: (value: string) => void
  onEditSelectedEnclosureIdChange: (value: string) => void
  onEditReminderIntervalMinChange: (value: string) => void
  onEditStartTimeChange: (value: string) => void
  onEditEndTimeChange: (value: string) => void
  onEditNotesChange: (value: string) => void
}

function statusBadgeClass(status: WorkSession['status']) {
  if (status === 'active') return 'bg-emerald-100 text-emerald-800'
  if (status === 'paused') return 'bg-amber-100 text-amber-900'
  return 'bg-neutral-200 text-neutral-700'
}

export function WorkSessionHistoryCard({
  sessions,
  nowMs,
  isSaving,
  editingSessionId,
  herdsById,
  enclosuresById,
  herds,
  enclosures,
  editWorkPickerSectionId,
  editWorkType,
  editWorkActivityId,
  editSelectedHerdId,
  editSelectedEnclosureId,
  editReminderIntervalMin,
  editStartTime,
  editEndTime,
  editNotes,
  error,
  onStartEditingSession,
  onCancelEditingSession,
  onDeleteWorkSession,
  onSaveEditedSession,
  onEditWorkPickerSectionChange,
  onEditWorkSelectionChange,
  onEditSelectedHerdIdChange,
  onEditSelectedEnclosureIdChange,
  onEditReminderIntervalMinChange,
  onEditStartTimeChange,
  onEditEndTimeChange,
  onEditNotesChange,
}: WorkSessionHistoryCardProps) {
  return (
    <section className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-[-0.02em]">Arbeitseinsätze</h2>
        <span className="text-sm font-medium text-neutral-700">{sessions.length}</span>
      </div>

      {sessions.length === 0 ? (
        <div className="mt-4 rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm text-neutral-700 shadow-sm">
          Noch keine Arbeitseinsätze erfasst.
        </div>
      ) : (
        <div className="mt-4 max-h-[38rem] space-y-3 overflow-y-auto pr-1">
          {sessions.map((session) => (
            <article
              key={session.id}
              className="rounded-[1.15rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-neutral-900">{getWorkLabel(session)}</div>
                  <div className="mt-1 text-sm text-neutral-700">
                    {formatDateTime(session.startTime)}
                    {session.endTime ? ` bis ${formatDateTime(session.endTime)}` : ' bis jetzt'}
                  </div>
                  <div className="mt-1 text-sm text-neutral-700">
                    Dauer{' '}
                    {formatDuration(
                      session.status === 'active'
                        ? getLiveDurationS(session, nowMs)
                        : session.durationS
                    )}
                    {session.herdId ? (
                      <> · Herde {herdsById.get(session.herdId)?.name ?? 'Unbekannt'}</>
                    ) : null}
                    {session.enclosureId ? (
                      <> · Pferch {enclosuresById.get(session.enclosureId)?.name ?? 'Unbekannt'}</>
                    ) : null}
                  </div>
                  {session.notes ? (
                    <div className="mt-2 text-sm text-neutral-700">{session.notes}</div>
                  ) : null}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div
                    className={[
                      'rounded-full px-3 py-1 text-xs font-semibold',
                      statusBadgeClass(session.status),
                    ].join(' ')}
                  >
                    {getWorkStatusLabel(session.status)}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        editingSessionId === session.id
                          ? onCancelEditingSession()
                          : onStartEditingSession(session)
                      }
                      className="rounded-full border border-[#ccb98a] bg-[#f1efeb] px-3 py-2 text-xs font-semibold text-neutral-950"
                    >
                      {editingSessionId === session.id ? 'Abbrechen' : 'Bearbeiten'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDeleteWorkSession(session)}
                      disabled={isSaving}
                      className="rounded-full border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-900 disabled:opacity-50"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              </div>

              {editingSessionId === session.id ? (
                <WorkSessionEditForm
                  isSaving={isSaving}
                  status={session.status}
                  editWorkPickerSectionId={editWorkPickerSectionId}
                  editWorkType={editWorkType}
                  editWorkActivityId={editWorkActivityId}
                  editSelectedHerdId={editSelectedHerdId}
                  editSelectedEnclosureId={editSelectedEnclosureId}
                  editReminderIntervalMin={editReminderIntervalMin}
                  editStartTime={editStartTime}
                  editEndTime={editEndTime}
                  editNotes={editNotes}
                  errorMessage={error}
                  herds={herds}
                  enclosures={enclosures}
                  onEditWorkPickerSectionChange={onEditWorkPickerSectionChange}
                  onEditWorkSelectionChange={onEditWorkSelectionChange}
                  onEditSelectedHerdIdChange={onEditSelectedHerdIdChange}
                  onEditSelectedEnclosureIdChange={onEditSelectedEnclosureIdChange}
                  onEditReminderIntervalMinChange={onEditReminderIntervalMinChange}
                  onEditStartTimeChange={onEditStartTimeChange}
                  onEditEndTimeChange={onEditEndTimeChange}
                  onEditNotesChange={onEditNotesChange}
                  onSave={() => onSaveEditedSession(session.id)}
                  onCancel={onCancelEditingSession}
                />
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
