import type { SessionEventType } from '@/lib/maps/grazing-session-map-helper-types'

export function formatDistance(distanceM: number) {
  if (!Number.isFinite(distanceM) || distanceM <= 0) return '0 m'
  if (distanceM >= 1000) return `${(distanceM / 1000).toFixed(2)} km`
  return `${Math.round(distanceM)} m`
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

export function formatDateTime(timestamp: string) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
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

export function formatDateLabel(timestamp: string) {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(timestamp))
}

export function getSessionEventLabel(type: SessionEventType) {
  switch (type) {
    case 'water':
      return 'Wasser'
    case 'rest':
      return 'Rast'
    case 'move':
      return 'Bewegung'
    case 'disturbance':
      return 'Störung'
    case 'note':
      return 'Notiz'
    case 'start':
      return 'Start'
    case 'pause':
      return 'Pause'
    case 'resume':
      return 'Fortsetzen'
    case 'stop':
      return 'Ende'
    default:
      return type
  }
}
