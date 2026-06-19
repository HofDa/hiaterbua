import type { FormEvent } from 'react'
import {
  createWorkSessionRecord,
  deleteWorkSessionRecord,
  updateWorkSessionStatusRecord,
} from '@/lib/db/repositories/work-sessions'
import { getWorkLabel } from '@/lib/work/work-session-helpers'
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
      const parsedReminderIntervalMin = Number.parseInt(reminderIntervalMin, 10) || 0

      await createWorkSessionRecord({
        type: workType,
        activityId: workActivityId,
        herdId: selectedHerdId || null,
        enclosureId: selectedEnclosureId || null,
        reminderIntervalMin: parsedReminderIntervalMin,
        notes,
      })

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
      await updateWorkSessionStatusRecord(activeSession, nextStatus)

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
      await deleteWorkSessionRecord(session.id)

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
