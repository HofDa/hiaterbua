// Pure backup-reminder logic, kept free of any db/browser imports so it stays
// trivially testable and reusable.

const DAY_MS = 1000 * 60 * 60 * 24

// How long after the last backup (with newer data) before we nudge again.
export const BACKUP_REMINDER_AFTER_DAYS = 14

export function daysSince(iso: string, now: number = Date.now()): number {
  return Math.floor((now - new Date(iso).getTime()) / DAY_MS)
}

export type BackupReminderInput = {
  hasData: boolean
  lastExportAt: string | null | undefined
  latestChangeAt: string | null
  now?: number
}

export function shouldRemindBackup({
  hasData,
  lastExportAt,
  latestChangeAt,
  now = Date.now(),
}: BackupReminderInput): boolean {
  if (!hasData) return false

  // Never backed up yet but there is data to lose.
  if (!lastExportAt) return true

  // Only nag when something actually changed since the last backup, so a user
  // who is up to date is never reminded.
  const exportedMs = new Date(lastExportAt).getTime()
  const changedSinceExport = latestChangeAt
    ? new Date(latestChangeAt).getTime() > exportedMs
    : false
  if (!changedSinceExport) return false

  return now - exportedMs >= BACKUP_REMINDER_AFTER_DAYS * DAY_MS
}
