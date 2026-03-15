import { useMemo, useState } from 'react'
import { useWorkPageEditController } from '@/components/work/hooks/use-work-page-edit-controller'
import { useWorkPageFormState } from '@/components/work/hooks/use-work-page-controller/use-work-page-form-state'
import { useWorkPageSessionActions } from '@/components/work/hooks/use-work-page-controller/use-work-page-session-actions'
import { useWorkPageReminders } from '@/components/work/hooks/use-work-page-reminders'
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

  const { startWorkSession, updateWorkSessionStatus, deleteWorkSession } =
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
    startEditingSession,
    cancelEditingSession,
    saveEditedSession,
    deleteWorkSession,
  }
}
