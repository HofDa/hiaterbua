import { formatDateTimeShort, formatSpan } from '@/lib/utils/format'
import { nowIso } from '@/lib/utils/time'

export function formatDateTime(value: string | null | undefined) {
  if (!value) return 'unbekannt'
  return formatDateTimeShort(value)
}

export function formatDurationFromIso(startTime: string | null | undefined, endTime?: string | null) {
  if (!startTime) return 'unbekannt'

  const startMs = new Date(startTime).getTime()
  const endMs = new Date(endTime ?? nowIso()).getTime()

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return 'unbekannt'
  }

  return formatSpan((endMs - startMs) / 1000 / 60)
}

export function safeString(value: string | null | undefined) {
  return value?.trim() ?? ''
}
