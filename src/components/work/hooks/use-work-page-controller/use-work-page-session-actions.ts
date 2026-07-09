import type { FormEvent } from 'react'
import { triggerHaptic } from '@/hooks/use-haptic-feedback'
import { useConfirm } from '@/components/ui/confirm-dialog'
import {
  createWorkSessionRecord,
  deleteWorkSessionRecord,
  updateWorkSessionStatusRecord,
} from '@/lib/db/repositories/work-sessions'
import { recordFieldDiagnostic } from '@/lib/diagnostics/field-diagnostics'
import { getBrowserNotificationPermission } from '@/lib/notifications/browser-notifications'
import { getWorkSessionStartedStatusMessage } from '@/lib/work/work-session-notifications'
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
  const confirm = useConfirm()

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

      const session = await createWorkSessionRecord({
        type: workType,
        activityId: workActivityId,
        herdId: selectedHerdId || null,
        enclosureId: selectedEnclosureId || null,
        reminderIntervalMin: parsedReminderIntervalMin,
        notes,
      })
      recordFieldDiagnostic({
        type: 'work_session_started',
        message: 'Arbeitseinsatz gestartet.',
        activeWorkSessionId: session.id,
        details: {
          workType,
          activityId: workActivityId,
          reminderEnabled: parsedReminderIntervalMin > 0,
        },
      })

      resetStartedSessionForm()
      setActiveReminderMessage('')
      setStatusMessage(
        getWorkSessionStartedStatusMessage({
          reminderIntervalMin: parsedReminderIntervalMin,
          notificationPermission: getBrowserNotificationPermission(),
        })
      )
      triggerHaptic('success')
    } catch (currentError) {
      recordFieldDiagnostic({
        type: 'indexeddb_write_failed',
        level: 'error',
        message: 'Arbeitseinsatz konnte lokal nicht gestartet werden.',
        details: currentError,
      })
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
      if (nextStatus === 'finished') {
        recordFieldDiagnostic({
          type: 'work_session_stopped',
          message: 'Arbeitseinsatz beendet.',
          activeWorkSessionId: activeSession.id,
          details: { previousStatus: activeSession.status },
        })
      }

      setStatusMessage(getStatusUpdateMessage(nextStatus))
      triggerHaptic(nextStatus === 'finished' ? 'success' : 'medium')

      if (nextStatus !== 'active') {
        setActiveReminderMessage('')
      }

      if (nextStatus === 'finished') {
        resetReminderTrigger()
      }
    } catch (currentError) {
      recordFieldDiagnostic({
        type: 'indexeddb_write_failed',
        level: 'error',
        message: 'Arbeitseinsatz-Status konnte lokal nicht gespeichert werden.',
        activeWorkSessionId: activeSession.id,
        details: currentError,
      })
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
    const confirmed = await confirm({
      title: 'Arbeitseinsatz löschen?',
      description: `"${getWorkLabel(session)}" wirklich löschen?`,
      confirmLabel: 'Löschen',
      destructive: true,
    })

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
