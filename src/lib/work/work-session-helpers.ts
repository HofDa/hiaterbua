import { db } from '@/lib/db/dexie'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type {
  WorkActivityId,
  WorkEvent,
  WorkSession,
  WorkStatus,
  WorkType,
} from '@/types/domain'

export const workTypeOptions: { value: WorkType; label: string }[] = [
  { value: 'herding', label: 'Hüten' },
  { value: 'driving', label: 'Treiben' },
  { value: 'fence', label: 'Zaunbau' },
  { value: 'control', label: 'Kontrolle' },
  { value: 'water', label: 'Wasser' },
  { value: 'transport', label: 'Transport' },
  { value: 'other', label: 'Sonstiges' },
]

export type WorkPickerSectionId =
  | 'guided_herd_management'
  | 'guided_infrastructure'
  | 'guided_animal_care'
  | 'guided_pasture_care'

export type WorkSelection = {
  type: WorkType
  activityId: WorkActivityId | null
}

export type WorkPickerOption = {
  id: string
  label: string
  workType: WorkType
  activityId?: WorkActivityId
}

export type WorkPickerSection = {
  id: WorkPickerSectionId
  label: string
  description: string
  options: WorkPickerOption[]
}

export const defaultWorkPickerSectionId: WorkPickerSectionId = 'guided_herd_management'
export const defaultWorkSelection: WorkSelection = {
  type: 'herding',
  activityId: 'guided_herd_grazing_animals',
}

export const workPickerSections: WorkPickerSection[] = [
  {
    id: 'guided_herd_management',
    label: 'Herdenlenkung',
    description: 'Gelenkte Weideführung',
    options: [
      {
        id: 'guided_access_to_grazing_animals',
        activityId: 'guided_access_to_grazing_animals',
        label: 'Weg zu den Weidetieren und zurück',
        workType: 'transport',
      },
      {
        id: 'guided_lead_grazing_animals',
        activityId: 'guided_lead_grazing_animals',
        label: 'Führen der Weidetiere',
        workType: 'driving',
      },
      {
        id: 'guided_herd_grazing_animals',
        activityId: 'guided_herd_grazing_animals',
        label: 'Hüten der Weidetiere',
        workType: 'herding',
      },
      {
        id: 'guided_collect_grazing_animals',
        activityId: 'guided_collect_grazing_animals',
        label: 'Sammeln der Weidetiere',
        workType: 'driving',
      },
    ],
  },
  {
    id: 'guided_infrastructure',
    label: 'Infrastruktur',
    description: 'Gelenkter Weidegang',
    options: [
      {
        id: 'guided_fence_work',
        activityId: 'guided_fence_work',
        label: 'Zaunarbeiten',
        workType: 'fence',
      },
      {
        id: 'guided_overnight_fence_work',
        activityId: 'guided_overnight_fence_work',
        label: 'Zaunarbeiten für Übernachtung',
        workType: 'fence',
      },
      {
        id: 'guided_material_shift',
        activityId: 'guided_material_shift',
        label: 'Materialverschiebung',
        workType: 'transport',
      },
    ],
  },
  {
    id: 'guided_animal_care',
    label: 'Tierbetreuung',
    description: 'Versorgung und Kontrolle',
    options: [
      {
        id: 'guided_check_grazing_animals',
        activityId: 'guided_check_grazing_animals',
        label: 'Versorgung / Kontrolle Weidetiere',
        workType: 'control',
      },
      {
        id: 'guided_check_lambing',
        activityId: 'guided_check_lambing',
        label: 'Versorgung / Kontrolle Ablammungen (Muttertiere und Lämmer)',
        workType: 'control',
      },
      {
        id: 'guided_check_herding_dogs',
        activityId: 'guided_check_herding_dogs',
        label: 'Versorgung / Kontrolle Hütehunde',
        workType: 'control',
      },
      {
        id: 'guided_check_guard_dogs',
        activityId: 'guided_check_guard_dogs',
        label: 'Versorgung / Kontrolle Herdenschutzhunde',
        workType: 'control',
      },
    ],
  },
  {
    id: 'guided_pasture_care',
    label: 'Weidepflege',
    description: 'Gelenkter Weidegang',
    options: [
      {
        id: 'guided_brush_clearing_with_grazers',
        activityId: 'guided_brush_clearing_with_grazers',
        label: 'Entbuschung mit Schafen/Ziegen (Koppeln)',
        workType: 'other',
      },
      {
        id: 'guided_detangling',
        activityId: 'guided_detangling',
        label: 'Entfilzung (Pferde und Schafe)',
        workType: 'other',
      },
      {
        id: 'guided_follow_up_grazing',
        activityId: 'guided_follow_up_grazing',
        label: 'Nachweide',
        workType: 'other',
      },
      {
        id: 'guided_fence_work_for_brush_clearing',
        activityId: 'guided_fence_work_for_brush_clearing',
        label: 'Zaunarbeiten für Entbuschung',
        workType: 'fence',
      },
      {
        id: 'guided_trampling_via_overdrive',
        activityId: 'guided_trampling_via_overdrive',
        label: 'Vertritt durch Übertrieb',
        workType: 'driving',
      },
    ],
  },
]

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
    type: 'control',
    activityId: 'guided_check_grazing_animals',
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

export const reminderOptions = [
  { value: '0', label: 'Keine Erinnerung' },
  { value: '15', label: 'Alle 15 min' },
  { value: '30', label: 'Alle 30 min' },
  { value: '60', label: 'Alle 60 min' },
  { value: '90', label: 'Alle 90 min' },
]

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
  return workPickerSectionById.get(sectionId) ?? workPickerSectionById.get(defaultWorkPickerSectionId)!
}

export function getWorkSelectionForOption(sectionId: WorkPickerSectionId, optionId: string) {
  const section = getWorkPickerSection(sectionId)
  const option = section.options.find((entry) => entry.id === optionId) ?? section.options[0]

  return {
    type: option.workType,
    activityId: option.activityId ?? null,
  }
}

export function getWorkStatusLabel(status: WorkStatus | null | undefined) {
  if (status === 'active') return 'Läuft'
  if (status === 'paused') return 'Pausiert'
  if (status === 'finished') return 'Beendet'
  return 'Bereit'
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return 'unbekannt'
  return new Date(value).toLocaleString('de-DE')
}

function padDateTimeInputPart(value: number) {
  return String(value).padStart(2, '0')
}

export function formatDateTimeInputValue(value: string | null | undefined) {
  if (!value) return ''

  const parsedValue = new Date(value)
  if (!Number.isFinite(parsedValue.getTime())) return ''

  const year = parsedValue.getFullYear()
  const month = padDateTimeInputPart(parsedValue.getMonth() + 1)
  const day = padDateTimeInputPart(parsedValue.getDate())
  const hours = padDateTimeInputPart(parsedValue.getHours())
  const minutes = padDateTimeInputPart(parsedValue.getMinutes())

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function parseDateTimeInputValue(value: string) {
  const trimmedValue = value.trim()
  if (!trimmedValue) return null

  const parsedValue = new Date(trimmedValue)
  if (!Number.isFinite(parsedValue.getTime())) return null

  return parsedValue.toISOString()
}

export function getDurationSecondsBetween(startTime: string, endTime: string) {
  const startMs = new Date(startTime).getTime()
  const endMs = new Date(endTime).getTime()

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0

  return Math.max(0, Math.round((endMs - startMs) / 1000))
}

export function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}

export function getLiveDurationS(session: WorkSession, nowMs: number) {
  if (!session.activeSince) return session.durationS

  const activeSinceMs = new Date(session.activeSince).getTime()
  if (!Number.isFinite(activeSinceMs)) return session.durationS

  return session.durationS + Math.max(0, Math.round((nowMs - activeSinceMs) / 1000))
}

export function getNextReminderMs(session: WorkSession) {
  if (!session.reminderIntervalMin || session.reminderIntervalMin <= 0) return null

  const baseTime = session.lastReminderAt ?? session.activeSince ?? session.startTime
  const baseMs = new Date(baseTime).getTime()
  if (!Number.isFinite(baseMs)) return null

  return baseMs + session.reminderIntervalMin * 60 * 1000
}

export async function addWorkEvent(
  workSessionId: string,
  type: WorkEvent['type'],
  comment?: string
) {
  await db.workEvents.add({
    id: createId('work_event'),
    workSessionId,
    timestamp: nowIso(),
    type,
    comment: comment?.trim() || undefined,
  })
}
