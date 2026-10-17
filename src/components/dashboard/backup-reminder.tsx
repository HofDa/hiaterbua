'use client'

import Link from 'next/link'
import { useLiveQuery } from 'dexie-react-hooks'
import { getAppSettings } from '@/lib/db/repositories/settings'
import { ShieldAlert } from 'lucide-react'
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
      getAppSettings(),
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

  // Only speak up when a backup is actually due — then loudly. This phone may
  // hold a whole season of records with no other copy; a soft "Info" box with
  // a 20px link carried the same weight as trivia.
  if (!shouldRemindBackup(info)) return null

  const message = info.lastExportAt
    ? `Letztes Backup vor ${daysSince(info.lastExportAt)} Tagen (${formatBackupTime(info.lastExportAt)}). Seitdem gibt es neue Einträge.`
    : 'Noch kein Backup. Alle Einträge liegen bisher nur auf diesem Gerät.'

  return (
    <section
      aria-labelledby="backup-due"
      className="rounded-[1.35rem] border-2 border-warning-border bg-warning-surface p-4 text-ink-strong"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-warning-ink" strokeWidth={2.4} />
        <div className="min-w-0">
          <h2 id="backup-due" className="text-lg font-bold leading-tight">
            Daten sichern
          </h2>
          <p className="mt-1 text-sm font-medium text-ink">{message}</p>
        </div>
      </div>
      <Link
        href="/export"
        className="mt-3 flex min-h-12 w-full items-center justify-center rounded-[1.1rem] border-2 border-primary bg-primary px-4 text-base font-bold text-primary-foreground transition-colors hover:bg-chrome-strong"
      >
        Jetzt sichern
      </Link>
    </section>
  )
}
