import type { WorkSession, WorkStatus } from '@/types/domain'

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
