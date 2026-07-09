'use client'

import Link from 'next/link'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/dexie'
import { StatusAlert } from '@/components/ui/alert'
import { useFieldSafety } from '@/lib/field-safety/use-field-safety'
import { daysSince, shouldRemindBackup } from '@/lib/settings/backup-reminder'
import {
  getLocalChangeSummary,
  hasLocalChangesSinceBackup,
} from '@/lib/sync/local-change-summary'

function formatBackupTime(value: string | null) {
  if (!value) return 'noch nicht erstellt'

  return new Intl.DateTimeFormat('de', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function BackupReminder() {
  const { isFieldOperationActive } = useFieldSafety()
  const info = useLiveQuery(async () => {
    const [settings, changeSummary] = await Promise.all([
      db.settings.get('app'),
      getLocalChangeSummary(),
    ])

    return {
      lastExportAt: settings?.lastExportAt ?? null,
      hasData: changeSummary.recordCount > 0,
      latestChangeAt: changeSummary.latestLocalChangeAt,
      hasLocalChanges: hasLocalChangesSinceBackup(
        changeSummary.latestLocalChangeAt,
        settings?.lastExportAt
      ),
    }
  }, [])

  if (isFieldOperationActive || !info || !info.hasData) return null

  const backupRecommended = shouldRemindBackup(info)
  const localChangesLabel = info.hasLocalChanges
    ? 'Lokale Änderungen vorhanden'
    : 'Keine neuen lokalen Änderungen seit dem letzten Backup'
  const backupLabel = `Letztes Backup: ${formatBackupTime(info.lastExportAt)}`
  const recommendationLabel = backupRecommended
    ? 'Backup empfohlen'
    : info.lastExportAt
      ? `Backup vor ${daysSince(info.lastExportAt)} Tagen`
      : 'Backup noch offen'

  return (
    <StatusAlert variant="info">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          {localChangesLabel} · {backupLabel} · {recommendationLabel}
        </span>
        <Link href="/export" className="font-semibold underline underline-offset-2">
          Jetzt sichern
        </Link>
      </div>
    </StatusAlert>
  )
}
