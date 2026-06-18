'use client'

import Link from 'next/link'
import { useLiveQuery } from 'dexie-react-hooks'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { BackupReminder } from '@/components/dashboard/backup-reminder'
import { db } from '@/lib/db/dexie'
import { cn } from '@/lib/utils/cn'

function DashboardStat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card variant="dashboard">
      <CardContent className="p-5">
        <div className="text-sm font-semibold text-ink-soft">{label}</div>
        <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink-strong">{value}</div>
      </CardContent>
    </Card>
  )
}

const fieldStartLinks = [
  { href: '/work', title: 'Arbeit', description: 'Arbeitszeit im Feld mit Erinnerung erfassen.' },
  { href: '/sessions', title: 'Weidegang', description: 'Geführten Weidegang direkt starten oder fortsetzen.' },
  { href: '/enclosures', title: 'Pferch', description: 'Pferch zeichnen, Walk starten und Belegung prüfen.' },
  { href: '/herds', title: 'Herde', description: 'Herde öffnen, Tiere prüfen und Belegungen anpassen.' },
]

const utilityLinks = [
  {
    href: '/export',
    label: 'Im-/Export',
  },
  {
    href: '/settings',
    label: 'Einstellungen',
  },
]

export default function HomePage() {
  const dashboardData = useLiveQuery(async () => {
    const [herds, enclosures, sessions, assignments, workSessions] = await Promise.all([
      db.herds.toArray(),
      db.enclosures.toArray(),
      db.sessions.toArray(),
      db.enclosureAssignments.toArray(),
      db.workSessions.toArray(),
    ])

    return {
      herdsCount: herds.filter((herd) => !herd.isArchived).length,
      enclosuresCount: enclosures.length,
      sessionsCount: sessions.length,
      activeSessionsCount: sessions.filter(
        (session) => session.status === 'active' || session.status === 'paused'
      ).length,
      activeAssignmentsCount: assignments.filter((assignment) => !assignment.endTime).length,
      activeWorkSessionsCount: workSessions.filter(
        (session) => session.status === 'active' || session.status === 'paused'
      ).length,
    }
  }, [])

  return (
    <div className="space-y-5">
      <BackupReminder />

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
            Feldstart
          </CardTitle>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-ink-strong">
            Häufigste Aktionen im Außeneinsatz
          </h2>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {fieldStartLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-[1.5rem] border border-border bg-surface-raised px-4 py-4 shadow-[0_18px_36px_rgba(40,34,26,0.08)]"
              >
                <div className="text-lg font-semibold tracking-[-0.02em] text-ink">
                  {link.title}
                </div>
                <div className="mt-2 text-sm font-medium text-ink-muted">
                  {link.description}
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {utilityLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(buttonVariants({ variant: 'secondary' }), 'rounded-full')}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between py-4">
          <div>
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
              Einsatzbereit
            </CardTitle>
            <CardDescription className="mt-1">
              Vor Ort nur kurz prüfen: App installiert, Kartenbereich offline gesichert, GPS empfangbar.
            </CardDescription>
          </div>
          <Link
            href="/settings"
            className={cn(buttonVariants({ variant: 'secondary' }), 'rounded-full')}
          >
            Offline & GPS prüfen
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <DashboardStat label="Aktive Herden" value={dashboardData?.herdsCount ?? '...'} />
        <DashboardStat label="Pferche" value={dashboardData?.enclosuresCount ?? '...'} />
        <DashboardStat label="Laufende Weidegänge" value={dashboardData?.activeSessionsCount ?? '...'} />
        <DashboardStat label="Weidegänge gesamt" value={dashboardData?.sessionsCount ?? '...'} />
        <DashboardStat label="Aktive Pferch-Belegungen" value={dashboardData?.activeAssignmentsCount ?? '...'} />
        <DashboardStat label="Arbeit läuft" value={dashboardData?.activeWorkSessionsCount ?? '...'} />
      </div>
    </div>
  )
}
