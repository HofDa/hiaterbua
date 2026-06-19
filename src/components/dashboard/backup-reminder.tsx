'use client'

import Link from 'next/link'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/dexie'
import { listAllEnclosures } from '@/lib/db/repositories/enclosures'
import { listAllHerds } from '@/lib/db/repositories/herds'
import { listAllSessions } from '@/lib/db/repositories/sessions'
import { listAllWorkSessions } from '@/lib/db/repositories/work-sessions'
import { StatusAlert } from '@/components/ui/alert'
import { daysSince, shouldRemindBackup } from '@/lib/settings/backup-reminder'

export function BackupReminder() {
  const info = useLiveQuery(async () => {
    const [settings, herds, enclosures, sessions, workSessions, assignments] = await Promise.all([
      db.settings.get('app'),
      listAllHerds(),
      listAllEnclosures(),
      listAllSessions(),
      listAllWorkSessions(),
      db.enclosureAssignments.toArray(),
    ])

    const hasData =
      herds.length > 0 ||
      enclosures.length > 0 ||
      sessions.length > 0 ||
      workSessions.length > 0

    const updatedTimes = [
      ...herds.map((herd) => herd.updatedAt),
      ...enclosures.map((enclosure) => enclosure.updatedAt),
      ...sessions.map((session) => session.updatedAt),
      ...workSessions.map((session) => session.updatedAt),
      ...assignments.map((assignment) => assignment.updatedAt),
    ].filter((value): value is string => Boolean(value))

    const latestChangeAt =
      updatedTimes.length > 0
        ? updatedTimes.reduce((latest, value) => (value > latest ? value : latest))
        : null

    return { lastExportAt: settings?.lastExportAt ?? null, hasData, latestChangeAt }
  }, [])

  if (!info || !shouldRemindBackup(info)) return null

  const message = info.lastExportAt
    ? `Letztes Backup vor ${daysSince(info.lastExportAt)} Tagen – es gibt neue Daten.`
    : 'Noch kein Backup erstellt. Deine Daten liegen nur auf diesem Gerät.'

  return (
    <StatusAlert variant="info">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>{message}</span>
        <Link href="/export" className="font-semibold underline underline-offset-2">
          Jetzt sichern
        </Link>
      </div>
    </StatusAlert>
  )
}
