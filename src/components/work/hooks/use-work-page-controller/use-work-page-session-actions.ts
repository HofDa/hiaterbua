import { useState, type FormEvent } from 'react'
import { triggerHaptic } from '@/hooks/use-haptic-feedback'
import { useConfirm } from '@/components/ui/confirm-dialog'
import {
  createWorkSessionRecord,
  deleteWorkSessionRecord,
  getWorkSession,
  reopenFinishedWorkSessionRecord,
  updateWorkSessionStatusRecord,
} from '@/lib/db/repositories/work-sessions'
import { recordFieldDiagnostic } from '@/lib/diagnostics/field-diagnostics'
import { getBrowserNotificationPermission } from '@/lib/notifications/browser-notifications'
import { getWorkSessionStartedStatusMessage } from '@/lib/work/work-session-notifications'
import { getWorkLabel } from '@/lib/work/work-session-helpers'
import type { WorkActivityId, WorkSession, WorkStatus, WorkType } from '@/types/domain'

/** The Arbeitseinsatz just ended, for the shared "saved + undo" card. */
export type LastFinishedWork = {
  sessionId: string
  finishedAt: string
  previousStatus: 'active' | 'paused'
  label: string
  durationS: number
  herdId: string | null
}

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
  const [lastFinishedWork, setLastFinishedWork] = useState<LastFinishedWork | null>(null)

  async function startWorkSession(event: FormEvent<HTMLFormElement>) {
    setLastFinishedWork(null)
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

  /** "Wie zuletzt": start the same kind of work as the last finished one. */
  async function startLikeLast(last: WorkSession) {
    setLastFinishedWork(null)
    setIsSaving(true)
    setError('')
    setStatusMessage('')
    try {
      const session = await createWorkSessionRecord({
        type: last.type,
        activityId: last.activityId ?? null,
        herdId: last.herdId ?? null,
        enclosureId: last.enclosureId ?? null,
        reminderIntervalMin: last.reminderIntervalMin ?? 0,
        notes: '',
      })
      recordFieldDiagnostic({
        type: 'work_session_started',
        message: 'Arbeitseinsatz gestartet (wie zuletzt).',
        activeWorkSessionId: session.id,
        details: { workType: last.type, activityId: last.activityId ?? null },
      })
      setActiveReminderMessage('')
      triggerHaptic('success')
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

    // Same safeguard as ending a Weidegang: final, and right below Pause.
    if (nextStatus === 'finished') {
      const confirmed = await confirm({
        title: 'Arbeitseinsatz beenden?',
        description: 'Der Einsatz wird abgeschlossen und gespeichert.',
        confirmLabel: 'Beenden',
        cancelLabel: 'Weiterlaufen lassen',
        destructive: true,
      })
      if (!confirmed) return
    }

    setIsSaving(true)
    setError('')
    setStatusMessage('')

    try {
      await updateWorkSessionStatusRecord(activeSession, nextStatus)
      if (nextStatus === 'finished') {
        const finished = await getWorkSession(activeSession.id)
        if (finished?.endTime) {
          setLastFinishedWork({
            sessionId: finished.id,
            finishedAt: finished.endTime,
            previousStatus: activeSession.status === 'paused' ? 'paused' : 'active',
            label: getWorkLabel(finished),
            durationS: finished.durationS,
            herdId: finished.herdId ?? null,
          })
        }
        recordFieldDiagnostic({
          type: 'work_session_stopped',
          message: 'Arbeitseinsatz beendet.',
          activeWorkSessionId: activeSession.id,
          details: { previousStatus: activeSession.status },
        })
      }

      // Ending gets the summary card; pause/resume only a short line.
      setStatusMessage(nextStatus === 'finished' ? '' : getStatusUpdateMessage(nextStatus))
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

  async function undoFinishWorkSession() {
    if (!lastFinishedWork) return
    setIsSaving(true)
    setError('')
    try {
      await reopenFinishedWorkSessionRecord({
        sessionId: lastFinishedWork.sessionId,
        finishedAt: lastFinishedWork.finishedAt,
        previousStatus: lastFinishedWork.previousStatus,
      })
      setLastFinishedWork(null)
      triggerHaptic('success')
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Arbeitseinsatz konnte nicht fortgesetzt werden.'
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
    lastFinishedWork,
    startLikeLast,
    undoFinishWorkSession,
    dismissFinishedWork: () => setLastFinishedWork(null),
  }
}
