import { useState, type Dispatch, type SetStateAction } from 'react'
import { db } from '@/lib/db/dexie'
import {
  addWorkEvent,
  defaultWorkPickerSectionId,
  defaultWorkSelection,
  formatDateTimeInputValue,
  getDurationSecondsBetween,
  getWorkPickerSectionId,
  getWorkSelection,
  parseDateTimeInputValue,
  type WorkPickerSectionId,
  type WorkSelection,
} from '@/lib/work/work-session-helpers'
import { nowIso } from '@/lib/utils/time'
import type { WorkActivityId, WorkSession, WorkType } from '@/types/domain'

type UseWorkPageEditControllerOptions = {
  sessions: WorkSession[]
  activeSessionId: string | null
  setError: Dispatch<SetStateAction<string>>
  setStatusMessage: Dispatch<SetStateAction<string>>
  setIsSaving: Dispatch<SetStateAction<boolean>>
  resetReminderTrigger: () => void
  setActiveReminderMessage: Dispatch<SetStateAction<string>>
}

export function useWorkPageEditController({
  sessions,
  activeSessionId,
  setError,
  setStatusMessage,
  setIsSaving,
  resetReminderTrigger,
  setActiveReminderMessage,
}: UseWorkPageEditControllerOptions) {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editWorkPickerSectionId, setEditWorkPickerSectionId] =
    useState<WorkPickerSectionId>(defaultWorkPickerSectionId)
  const [editWorkType, setEditWorkType] = useState<WorkType>(defaultWorkSelection.type)
  const [editWorkActivityId, setEditWorkActivityId] = useState<WorkActivityId | null>(
    defaultWorkSelection.activityId
  )
  const [editSelectedHerdId, setEditSelectedHerdId] = useState('')
  const [editSelectedEnclosureId, setEditSelectedEnclosureId] = useState('')
  const [editReminderIntervalMin, setEditReminderIntervalMin] = useState('0')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [editNotes, setEditNotes] = useState('')

  function startEditingSession(session: WorkSession) {
    const resolvedSelection = getWorkSelection(session)

    setEditingSessionId(session.id)
    setEditWorkPickerSectionId(getWorkPickerSectionId(session))
    setEditWorkType(resolvedSelection.type)
    setEditWorkActivityId(resolvedSelection.activityId)
    setEditSelectedHerdId(session.herdId ?? '')
    setEditSelectedEnclosureId(session.enclosureId ?? '')
    setEditReminderIntervalMin(String(session.reminderIntervalMin ?? 0))
    setEditStartTime(formatDateTimeInputValue(session.startTime))
    setEditEndTime(formatDateTimeInputValue(session.endTime))
    setEditNotes(session.notes ?? '')
    setError('')
    setStatusMessage('')
  }

  function cancelEditingSession() {
    setEditingSessionId(null)
    setEditWorkPickerSectionId(defaultWorkPickerSectionId)
    setEditWorkType(defaultWorkSelection.type)
    setEditWorkActivityId(defaultWorkSelection.activityId)
    setEditSelectedHerdId('')
    setEditSelectedEnclosureId('')
    setEditReminderIntervalMin('0')
    setEditStartTime('')
    setEditEndTime('')
    setEditNotes('')
  }

  function applyEditWorkSelection(selection: WorkSelection) {
    setEditWorkType(selection.type)
    setEditWorkActivityId(selection.activityId)
  }

  async function saveEditedSession(sessionId: string) {
    setIsSaving(true)
    setError('')
    setStatusMessage('')

    try {
      const existingSession = sessions.find((session) => session.id === sessionId)
      if (!existingSession) {
        throw new Error('Arbeitseinsatz wurde nicht gefunden.')
      }

      const parsedStartTime = parseDateTimeInputValue(editStartTime)
      const parsedEndTime =
        editEndTime.trim().length > 0 ? parseDateTimeInputValue(editEndTime) : null

      if (!parsedStartTime) {
        throw new Error('Bitte einen gueltigen Beginn angeben.')
      }

      if (editEndTime.trim().length > 0 && !parsedEndTime) {
        throw new Error('Bitte ein gueltiges Ende angeben.')
      }

      const startMs = new Date(parsedStartTime).getTime()
      const endMs = parsedEndTime ? new Date(parsedEndTime).getTime() : null

      if (endMs !== null && endMs < startMs) {
        throw new Error('Das Ende muss nach dem Beginn liegen.')
      }

      if (existingSession.status === 'finished' && !parsedEndTime) {
        throw new Error('Beendete Einsaetze brauchen ein Ende.')
      }

      const reminderValue = Number.parseInt(editReminderIntervalMin, 10) || 0
      const timestamp = nowIso()
      const nextStatus = parsedEndTime ? 'finished' : existingSession.status
      const existingActiveSinceMs = existingSession.activeSince
        ? new Date(existingSession.activeSince).getTime()
        : null
      const nextActiveSince =
        nextStatus === 'active'
          ? existingActiveSinceMs !== null &&
            Number.isFinite(existingActiveSinceMs) &&
            existingActiveSinceMs >= startMs
            ? existingSession.activeSince
            : parsedStartTime
          : null

      let nextLastReminderAt: string | null = null
      if (reminderValue > 0) {
        const existingLastReminderMs = existingSession.lastReminderAt
          ? new Date(existingSession.lastReminderAt).getTime()
          : null

        nextLastReminderAt =
          existingLastReminderMs !== null &&
          Number.isFinite(existingLastReminderMs) &&
          existingLastReminderMs >= startMs
            ? existingSession.lastReminderAt ?? null
            : nextActiveSince ?? parsedStartTime

        if (
          parsedEndTime &&
          nextLastReminderAt &&
          new Date(nextLastReminderAt).getTime() > endMs!
        ) {
          nextLastReminderAt = parsedEndTime
        }
      }

      const nextDurationS = parsedEndTime
        ? getDurationSecondsBetween(parsedStartTime, parsedEndTime)
        : existingSession.durationS

      await db.transaction('rw', db.workSessions, db.workEvents, async () => {
        const updatedCount = await db.workSessions.update(sessionId, {
          type: editWorkType,
          activityId: editWorkActivityId,
          status: nextStatus,
          herdId: editSelectedHerdId || null,
          enclosureId: editSelectedEnclosureId || null,
          startTime: parsedStartTime,
          endTime: parsedEndTime,
          activeSince: nextActiveSince,
          durationS: nextDurationS,
          reminderIntervalMin: reminderValue > 0 ? reminderValue : null,
          lastReminderAt: nextLastReminderAt,
          notes: editNotes.trim() || undefined,
          updatedAt: timestamp,
        })

        if (updatedCount === 0) {
          throw new Error('Arbeitseinsatz konnte nicht aktualisiert werden.')
        }

        await addWorkEvent(sessionId, 'note', 'Arbeitseinsatz bearbeitet')
      })

      cancelEditingSession()

      if (existingSession.id === activeSessionId) {
        resetReminderTrigger()
        setActiveReminderMessage('')
      }

      setStatusMessage('Arbeitseinsatz aktualisiert.')
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Arbeitseinsatz konnte nicht aktualisiert werden.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return {
    editingSessionId,
    editWorkPickerSectionId,
    editWorkType,
    editWorkActivityId,
    editSelectedHerdId,
    editSelectedEnclosureId,
    editReminderIntervalMin,
    editStartTime,
    editEndTime,
    editNotes,
    setEditWorkPickerSectionId,
    setEditSelectedHerdId,
    setEditSelectedEnclosureId,
    setEditReminderIntervalMin,
    setEditStartTime,
    setEditEndTime,
    setEditNotes,
    applyEditWorkSelection,
    startEditingSession,
    cancelEditingSession,
    saveEditedSession,
  }
}
