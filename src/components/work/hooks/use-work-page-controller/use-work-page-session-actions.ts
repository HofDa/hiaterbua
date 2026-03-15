import type { FormEvent } from 'react'
import { db } from '@/lib/db/dexie'
import { addWorkEvent, getWorkLabel } from '@/lib/work/work-session-helpers'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type { WorkActivityId, WorkSession, WorkStatus, WorkType } from '@/types/domain'

type UseWorkPageSessionActionsOptions = {
  activeSession: WorkSession | null
  editingSessionId: string | null
  workType: WorkType
  workActivityId: WorkActivityId | null
  selectedHerdId: string
  selectedEnclosureId: string
  reminderIntervalMin: string
  notes: string
  cancelEditingSession: () => void
  resetStartedSessionForm: () => void
  resetReminderTrigger: () => void
  setActiveReminderMessage: (value: string) => void
  setStatusMessage: (value: string) => void
  setError: (value: string) => void
  setIsSaving: (value: boolean) => void
}

function getUpdatedSessionStatusPatch(
  activeSession: WorkSession,
  nextStatus: WorkStatus,
  timestamp: string
) {
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

  return nextPatch
}

function getStatusUpdateEventType(nextStatus: WorkStatus) {
  return nextStatus === 'paused' ? 'pause' : nextStatus === 'active' ? 'resume' : 'stop'
}

function getStatusUpdateMessage(nextStatus: WorkStatus) {
  return nextStatus === 'paused'
    ? 'Arbeitseinsatz pausiert.'
    : nextStatus === 'active'
      ? 'Arbeitseinsatz fortgesetzt.'
      : 'Arbeitseinsatz beendet.'
}

export function useWorkPageSessionActions({
  activeSession,
  editingSessionId,
  workType,
  workActivityId,
  selectedHerdId,
  selectedEnclosureId,
  reminderIntervalMin,
  notes,
  cancelEditingSession,
  resetStartedSessionForm,
  resetReminderTrigger,
  setActiveReminderMessage,
  setStatusMessage,
  setError,
  setIsSaving,
}: UseWorkPageSessionActionsOptions) {
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

      resetStartedSessionForm()
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
      const nextPatch = getUpdatedSessionStatusPatch(activeSession, nextStatus, timestamp)

      await db.workSessions.update(activeSession.id, nextPatch)
      await addWorkEvent(activeSession.id, getStatusUpdateEventType(nextStatus))

      setStatusMessage(getStatusUpdateMessage(nextStatus))

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
    startWorkSession,
    updateWorkSessionStatus,
    deleteWorkSession,
  }
}
