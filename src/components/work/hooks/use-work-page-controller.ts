import { useMemo, useState, type FormEvent } from 'react'
import { db } from '@/lib/db/dexie'
import {
  addWorkEvent,
  defaultWorkPickerSectionId,
  defaultWorkSelection,
  getWorkLabel,
  type WorkPickerSectionId,
  type WorkSelection,
} from '@/lib/work/work-session-helpers'
import { useWorkPageEditController } from '@/components/work/hooks/use-work-page-edit-controller'
import { useWorkPageReminders } from '@/components/work/hooks/use-work-page-reminders'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type { WorkActivityId, WorkSession, WorkStatus, WorkType } from '@/types/domain'

type UseWorkPageControllerOptions = {
  sessions: WorkSession[]
}

export function useWorkPageController({ sessions }: UseWorkPageControllerOptions) {
  const [workPickerSectionId, setWorkPickerSectionId] =
    useState<WorkPickerSectionId>(defaultWorkPickerSectionId)
  const [workType, setWorkType] = useState<WorkType>(defaultWorkSelection.type)
  const [workActivityId, setWorkActivityId] = useState<WorkActivityId | null>(
    defaultWorkSelection.activityId
  )
  const [selectedHerdId, setSelectedHerdId] = useState('')
  const [selectedEnclosureId, setSelectedEnclosureId] = useState('')
  const [reminderIntervalMin, setReminderIntervalMin] = useState('0')
  const [notes, setNotes] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const activeSession = useMemo(
    () =>
      sessions.find((session) => session.status === 'active' || session.status === 'paused') ??
      null,
    [sessions]
  )

  const {
    nextReminderMs,
    nowMs,
    activeReminderMessage,
    setActiveReminderMessage,
    resetReminderTrigger,
  } = useWorkPageReminders({
    activeSession,
    setStatusMessage,
  })

  const {
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
  } = useWorkPageEditController({
    sessions,
    activeSessionId: activeSession?.id ?? null,
    setError,
    setStatusMessage,
    setIsSaving,
    resetReminderTrigger,
    setActiveReminderMessage,
  })

  function applyWorkSelection(selection: WorkSelection) {
    setWorkType(selection.type)
    setWorkActivityId(selection.activityId)
  }

  async function startWorkSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (activeSession) {
      setError('Es läuft bereits ein Arbeitseinsatz.')
      return
    }

    setIsSaving(true)
    setError('')
    setStatusMessage('')

    try {
      const timestamp = nowIso()
      const sessionId = createId('work_session')
      const parsedReminderIntervalMin = Number.parseInt(reminderIntervalMin, 10) || 0

      await db.workSessions.add({
        id: sessionId,
        type: workType,
        activityId: workActivityId,
        status: 'active',
        herdId: selectedHerdId || null,
        enclosureId: selectedEnclosureId || null,
        startTime: timestamp,
        endTime: null,
        activeSince: timestamp,
        durationS: 0,
        reminderIntervalMin: parsedReminderIntervalMin > 0 ? parsedReminderIntervalMin : null,
        lastReminderAt: parsedReminderIntervalMin > 0 ? timestamp : null,
        notes: notes.trim() || undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
      })

      await addWorkEvent(sessionId, 'start', notes)

      if (
        parsedReminderIntervalMin > 0 &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        window.Notification.permission === 'default'
      ) {
        void window.Notification.requestPermission()
      }

      setNotes('')
      setSelectedHerdId('')
      setSelectedEnclosureId('')
      setReminderIntervalMin('0')
      setActiveReminderMessage('')
      setStatusMessage('Arbeitseinsatz gestartet.')
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Arbeitseinsatz konnte nicht gestartet werden.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function updateWorkSessionStatus(nextStatus: WorkStatus) {
    if (!activeSession) return

    setIsSaving(true)
    setError('')
    setStatusMessage('')

    try {
      const timestamp = nowIso()
      const currentTimeMs = new Date(timestamp).getTime()
      const activeSinceMs = activeSession.activeSince
        ? new Date(activeSession.activeSince).getTime()
        : null

      let nextDurationS = activeSession.durationS

      if (
        activeSession.status === 'active' &&
        activeSinceMs !== null &&
        Number.isFinite(activeSinceMs)
      ) {
        nextDurationS += Math.max(0, Math.round((currentTimeMs - activeSinceMs) / 1000))
      }

      const nextPatch: Partial<WorkSession> = {
        status: nextStatus,
        durationS: nextDurationS,
        updatedAt: timestamp,
      }

      if (nextStatus === 'paused') {
        nextPatch.activeSince = null
      }

      if (nextStatus === 'active') {
        nextPatch.activeSince = timestamp
        nextPatch.lastReminderAt = activeSession.reminderIntervalMin ? timestamp : null
      }

      if (nextStatus === 'finished') {
        nextPatch.activeSince = null
        nextPatch.endTime = timestamp
      }

      await db.workSessions.update(activeSession.id, nextPatch)

      const eventType =
        nextStatus === 'paused'
          ? 'pause'
          : nextStatus === 'active'
            ? 'resume'
            : 'stop'

      await addWorkEvent(activeSession.id, eventType)

      setStatusMessage(
        nextStatus === 'paused'
          ? 'Arbeitseinsatz pausiert.'
          : nextStatus === 'active'
            ? 'Arbeitseinsatz fortgesetzt.'
            : 'Arbeitseinsatz beendet.'
      )

      if (nextStatus !== 'active') {
        setActiveReminderMessage('')
      }

      if (nextStatus === 'finished') {
        resetReminderTrigger()
      }
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Status konnte nicht aktualisiert werden.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteWorkSession(session: WorkSession) {
    const confirmed = window.confirm(`Arbeitseinsatz "${getWorkLabel(session)}" wirklich löschen?`)

    if (!confirmed) return

    setIsSaving(true)
    setError('')
    setStatusMessage('')

    try {
      await db.transaction('rw', db.workSessions, db.workEvents, async () => {
        await db.workEvents.where('workSessionId').equals(session.id).delete()
        await db.workSessions.delete(session.id)
      })

      if (editingSessionId === session.id) {
        cancelEditingSession()
      }

      if (activeSession?.id === session.id) {
        resetReminderTrigger()
        setActiveReminderMessage('')
      }

      setStatusMessage('Arbeitseinsatz gelöscht.')
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Arbeitseinsatz konnte nicht gelöscht werden.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return {
    activeSession,
    nextReminderMs,
    nowMs,
    workPickerSectionId,
    workType,
    workActivityId,
    selectedHerdId,
    selectedEnclosureId,
    reminderIntervalMin,
    notes,
    statusMessage,
    error,
    isSaving,
    activeReminderMessage,
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
    setWorkPickerSectionId,
    setSelectedHerdId,
    setSelectedEnclosureId,
    setReminderIntervalMin,
    setNotes,
    setActiveReminderMessage,
    setEditWorkPickerSectionId,
    setEditSelectedHerdId,
    setEditSelectedEnclosureId,
    setEditReminderIntervalMin,
    setEditStartTime,
    setEditEndTime,
    setEditNotes,
    applyWorkSelection,
    applyEditWorkSelection,
    startWorkSession,
    updateWorkSessionStatus,
    startEditingSession,
    cancelEditingSession,
    saveEditedSession,
    deleteWorkSession,
  }
}
