import type { WorkActivityId, WorkType } from '@/types/domain'
import {
  defaultWorkPickerSectionId,
  defaultWorkSelection,
  type WorkPickerOption,
  type WorkPickerSectionId,
  type WorkSelection,
  workPickerSections,
  workTypeOptions,
} from '@/lib/work/work-session-catalog'

const workPickerSectionById = new Map(workPickerSections.map((section) => [section.id, section]))
const workActivityOptionById = new Map<WorkActivityId, WorkPickerOption>(
  workPickerSections.flatMap((section) =>
    section.options
      .filter((option): option is WorkPickerOption & { activityId: WorkActivityId } =>
        Boolean(option.activityId)
      )
      .map((option) => [option.activityId, option])
  )
)
const fallbackWorkSelectionByType: Record<WorkType, WorkSelection> = {
  herding: defaultWorkSelection,
  driving: {
    type: 'driving',
    activityId: 'guided_lead_grazing_animals',
  },
  fence: {
    type: 'fence',
    activityId: 'guided_fence_work',
  },
  control: {
    type: 'control',
    activityId: 'guided_check_grazing_animals',
  },
  water: {
    type: 'water',
    activityId: 'guided_water_supply',
  },
  transport: {
    type: 'transport',
    activityId: 'guided_access_to_grazing_animals',
  },
  other: {
    type: 'other',
    activityId: 'guided_follow_up_grazing',
  },
}

export function getWorkTypeLabel(type: WorkType) {
  return workTypeOptions.find((option) => option.value === type)?.label ?? type
}

export function getWorkActivityLabel(activityId: WorkActivityId | null | undefined) {
  if (!activityId) return null
  return workActivityOptionById.get(activityId)?.label ?? activityId
}

export function getWorkLabel(selection: {
  type: WorkType
  activityId?: WorkActivityId | null
}) {
  return getWorkActivityLabel(selection.activityId) ?? getWorkTypeLabel(selection.type)
}

export function getWorkSelection(selection: {
  type: WorkType
  activityId?: WorkActivityId | null
}): WorkSelection {
  if (selection.activityId) {
    return {
      type: selection.type,
      activityId: selection.activityId,
    }
  }

  return fallbackWorkSelectionByType[selection.type] ?? defaultWorkSelection
}

export function getWorkPickerSectionId(selection: {
  type: WorkType
  activityId?: WorkActivityId | null
}): WorkPickerSectionId {
  const resolvedSelection = getWorkSelection(selection)

  return (
    workPickerSections.find((section) =>
      section.options.some((option) => option.activityId === resolvedSelection.activityId)
    )?.id ?? defaultWorkPickerSectionId
  )
}

export function getDefaultWorkSelectionForSection(sectionId: WorkPickerSectionId): WorkSelection {
  const section = workPickerSectionById.get(sectionId) ?? workPickerSections[0]
  const defaultOption = section.options[0]

  return {
    type: defaultOption.workType,
    activityId: defaultOption.activityId ?? null,
  }
}

export function getWorkPickerSection(sectionId: WorkPickerSectionId) {
  return (
    workPickerSectionById.get(sectionId) ??
    workPickerSectionById.get(defaultWorkPickerSectionId)!
  )
}

export function getWorkSelectionForOption(sectionId: WorkPickerSectionId, optionId: string) {
  const section = getWorkPickerSection(sectionId)
  const option = section.options.find((entry) => entry.id === optionId) ?? section.options[0]

  return {
    type: option.workType,
    activityId: option.activityId ?? null,
  }
}
