import { useEffect, useMemo, useState } from 'react'
import { useWorkPageEditController } from '@/components/work/hooks/use-work-page-edit-controller'
import { useWorkPageFormState } from '@/components/work/hooks/use-work-page-controller/use-work-page-form-state'
import { useWorkPageSessionActions } from '@/components/work/hooks/use-work-page-controller/use-work-page-session-actions'
import { useWorkPageReminders } from '@/components/work/hooks/use-work-page-reminders'
import { selectCurrentSession } from '@/lib/recordings/active-recording-selection'
import type { WorkSession } from '@/types/domain'

type UseWorkPageControllerOptions = {
  sessions: WorkSession[]
}

export function useWorkPageController({ sessions }: UseWorkPageControllerOptions) {
  const {
    workPickerSectionId,
    workType,
    workActivityId,
    selectedHerdId,
    selectedEnclosureId,
    reminderIntervalMin,
    notes,
    setWorkPickerSectionId,
    setSelectedHerdId,
    setSelectedEnclosureId,
    setReminderIntervalMin,
    setNotes,
    applyWorkSelection,
    resetStartedSessionForm,
  } = useWorkPageFormState()
  const [statusMessage, setStatusMessage] = useState('')
  // Short confirmations ("Arbeitseinsatz gestartet.") fade after a moment
  // instead of repeating the live status for the rest of the session.
  useEffect(() => {
    if (!statusMessage) return
    const timer = window.setTimeout(() => setStatusMessage(''), 5000)
    return () => window.clearTimeout(timer)
  }, [statusMessage])
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const activeSession = useMemo(
    () => selectCurrentSession(sessions),
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

  const {
    startWorkSession,
    updateWorkSessionStatus,
    deleteWorkSession,
    lastFinishedWork,
    undoFinishWorkSession,
    dismissFinishedWork,
  } =
    useWorkPageSessionActions({
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
    })

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
    lastFinishedWork,
    undoFinishWorkSession,
    dismissFinishedWork,
    startEditingSession,
    cancelEditingSession,
    saveEditedSession,
    deleteWorkSession,
  }
}
