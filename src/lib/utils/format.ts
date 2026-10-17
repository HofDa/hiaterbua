const decimalFormatters = new Map<number, Intl.NumberFormat>()

/** German number formatting: "0,88", "8.800". */
export function formatDecimal(value: number, fractionDigits = 0): string {
  let formatter = decimalFormatters.get(fractionDigits)
  if (!formatter) {
    formatter = new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })
    decimalFormatters.set(fractionDigits, formatter)
  }
  return formatter.format(value)
}

/** "1 Punkt", "3 Punkte" — count with the right German noun form. */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

const dateTimeFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** "01.06.2026, 10:00" — field records don't need seconds. */
export function formatDateTimeShort(value: string | number | Date): string {
  return dateTimeFormatter.format(new Date(value))
}

/**
 * A long span in the unit people think in: "45 min", "3 h 05 min",
 * "1 Tag 4 h", "138 Tage" (instead of "3316 h 35 min").
 */
export function formatSpan(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes))
  const days = Math.floor(minutes / 1440)
  if (days >= 2) return `${days} Tage`
  const hours = Math.floor(minutes / 60)
  if (days === 1) return `1 Tag ${hours - 24} h`
  if (hours <= 0) return `${minutes} min`
  return `${hours} h ${String(minutes % 60).padStart(2, '0')} min`
}
