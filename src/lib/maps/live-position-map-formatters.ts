import { formatTimestamp } from '@/lib/maps/map-core'
import { nowIso } from '@/lib/utils/time'

export function formatPointTimestamp(timestamp: number) {
  return formatTimestamp(timestamp)
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return 'unbekannt'
  return new Date(value).toLocaleString('de-DE')
}

export function formatDate(value: string | null | undefined) {
  if (!value) return 'unbekannt'
  return new Date(value).toLocaleDateString('de-DE')
}

/** Compact "seit ..." phrase for list rows, e.g. "seit 3 Tagen" / "seit 5 Std." / "seit 20 min". */
export function formatSince(startTime: string | null | undefined) {
  if (!startTime) return null

  const startMs = new Date(startTime).getTime()
  const nowMs = new Date(nowIso()).getTime()

  if (!Number.isFinite(startMs) || nowMs < startMs) return null

  const totalMinutes = Math.floor((nowMs - startMs) / 1000 / 60)
  const days = Math.floor(totalMinutes / (60 * 24))
  if (days >= 1) return days === 1 ? 'seit 1 Tag' : `seit ${days} Tagen`

  const hours = Math.floor(totalMinutes / 60)
  if (hours >= 1) return `seit ${hours} Std.`

  return `seit ${totalMinutes} min`
}

export function formatDurationFromIso(startTime: string | null | undefined, endTime?: string | null) {
  if (!startTime) return 'unbekannt'

  const startMs = new Date(startTime).getTime()
  const endMs = new Date(endTime ?? nowIso()).getTime()

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return 'unbekannt'
  }

  const totalMinutes = Math.round((endMs - startMs) / 1000 / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours <= 0) return `${minutes} min`
  return `${hours} h ${String(minutes).padStart(2, '0')} min`
}

export function getDurationSecondsFromIso(
  startTime: string | null | undefined,
  endTime?: string | null
) {
  if (!startTime) return 0

  const startMs = new Date(startTime).getTime()
  const endMs = new Date(endTime ?? nowIso()).getTime()

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return 0
  }

  return Math.max(0, Math.round((endMs - startMs) / 1000))
}

export function formatDurationSeconds(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds))
  const totalMinutes = Math.round(safeSeconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours <= 0) return `${minutes} min`
  return `${hours} h ${String(minutes).padStart(2, '0')} min`
}
