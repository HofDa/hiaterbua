import { db } from '@/lib/db/dexie'
import { logError } from '@/lib/utils/log'

export {
  BACKUP_REMINDER_AFTER_DAYS,
  daysSince,
  shouldRemindBackup,
  type BackupReminderInput,
} from '@/lib/settings/backup-reminder-logic'

export async function recordDataBackup() {
  try {
    await db.settings.update('app', { lastExportAt: new Date().toISOString() })
  } catch (error) {
    logError('recordDataBackup', error)
  }
}
