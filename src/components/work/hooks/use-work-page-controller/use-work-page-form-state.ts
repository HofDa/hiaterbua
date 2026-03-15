import { useState } from 'react'
import {
  defaultWorkPickerSectionId,
  defaultWorkSelection,
  type WorkPickerSectionId,
  type WorkSelection,
} from '@/lib/work/work-session-helpers'
import type { WorkActivityId, WorkType } from '@/types/domain'

export function useWorkPageFormState() {
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

  function applyWorkSelection(selection: WorkSelection) {
    setWorkType(selection.type)
    setWorkActivityId(selection.activityId)
  }

  function resetStartedSessionForm() {
    setNotes('')
    setSelectedHerdId('')
    setSelectedEnclosureId('')
    setReminderIntervalMin('0')
  }

  return {
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
  }
}
