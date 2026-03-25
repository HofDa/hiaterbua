export function nowIso(): string {
  return new Date().toISOString()
}

export function isValidTimestamp(timestamp: string): boolean {
  const date = new Date(timestamp)
  return !isNaN(date.getTime())
}

export function getTimestampSeconds(timestamp: string): number {
  return new Date(timestamp).getTime() / 1000
}

export function addSecondsToTimestamp(timestamp: string, seconds: number): string {
  const date = new Date(timestamp)
  date.setSeconds(date.getSeconds() + seconds)
  return date.toISOString()
}

export function getDurationSeconds(startTime: string, endTime?: string): number {
  const start = new Date(startTime).getTime()
  const end = endTime ? new Date(endTime).getTime() : Date.now()
  return Math.floor((end - start) / 1000)
}

export function isTimestampRecent(timestamp: string, maxAgeSeconds: number = 300): boolean {
  const age = getDurationSeconds(timestamp)
  return age <= maxAgeSeconds
}

export function formatTimestampForDisplay(timestamp: string): string {
  return new Date(timestamp).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}