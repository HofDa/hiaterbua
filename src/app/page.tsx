'use client'

import Link from 'next/link'
import { useLiveQuery } from 'dexie-react-hooks'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FormButton } from '@/components/ui/form'
import { db } from '@/lib/db/dexie'

const fieldStartLinks = [
  {
    href: '/work',
    title: 'Arbeit',
    description: 'Arbeitszeit im Feld mit Erinnerung erfassen.',
    className:
      'border-[#ccb98a] bg-[#fffdf6] shadow-[0_18px_36px_rgba(40,34,26,0.08)]',
    titleClass: 'text-[#17130f]',
    descriptionClass: 'text-[#4f473c]',
  },
  {
    href: '/sessions',
    title: 'Weidegang',
    description: 'Geführten Weidegang direkt starten oder fortsetzen.',
    className:
      'border-[#ccb98a] bg-[#fffdf6] shadow-[0_18px_36px_rgba(40,34,26,0.08)]',
    titleClass: 'text-[#17130f]',
    descriptionClass: 'text-[#4f473c]',
  },
  {
    href: '/enclosures',
    title: 'Pferch',
    description: 'Pferch zeichnen, Walk starten und Belegung prüfen.',
    className:
      'border-[#ccb98a] bg-[#fffdf6] shadow-[0_18px_36px_rgba(40,34,26,0.08)]',
    titleClass: 'text-[#17130f]',
    descriptionClass: 'text-[#4f473c]',
  },
  {
    href: '/herds',
    title: 'Herde',
    description: 'Herde öffnen, Tiere prüfen und Belegungen anpassen.',
    className:
      'border-[#ccb98a] bg-[#fffdf6] shadow-[0_18px_36px_rgba(40,34,26,0.08)]',
    titleClass: 'text-[#17130f]',
    descriptionClass: 'text-[#4f473c]',
  },
]

const utilityLinks = [
  {
    href: '/export',
    label: 'Im-/Export',
    className:
      'border-[#ccb98a] bg-[#fffdf6] text-[#17130f]',
  },
  {
    href: '/settings',
    label: 'Einstellungen',
    className:
      'border-[#ccb98a] bg-[#fffdf6] text-[#17130f]',
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
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-800">
            Feldstart
          </CardTitle>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-neutral-950">
            Häufigste Aktionen im Außeneinsatz
          </h2>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {fieldStartLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-[1.5rem] border px-4 py-4 ${link.className}`}
              >
                <div className={`text-lg font-semibold tracking-[-0.02em] ${link.titleClass}`}>
                  {link.title}
                </div>
                <div className={`mt-2 text-sm font-medium ${link.descriptionClass}`}>
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
                className={`rounded-full border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-2 text-sm font-semibold shadow-sm ${link.className}`}
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
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-800">
              Einsatzbereit
            </CardTitle>
            <CardDescription className="mt-1">
              Vor Ort nur kurz prüfen: App installiert, Kartenbereich offline gesichert, GPS empfangbar.
            </CardDescription>
          </div>
          <Link href="/settings">
            <FormButton variant="secondary" className="rounded-full py-2 text-sm">
              Offline & GPS prüfen
            </FormButton>
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Card variant="dashboard">
          <CardContent className="p-5">
            <div className="text-sm font-semibold text-neutral-800">Aktive Herden</div>
            <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-neutral-950">
              {dashboardData?.herdsCount ?? '...'}
            </div>
          </CardContent>
        </Card>
        <Card variant="dashboard">
          <CardContent className="p-5">
            <div className="text-sm font-semibold text-neutral-800">Pferche</div>
            <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-neutral-950">
              {dashboardData?.enclosuresCount ?? '...'}
            </div>
          </CardContent>
        </Card>
        <Card variant="dashboard">
          <CardContent className="p-5">
            <div className="text-sm font-semibold text-neutral-800">Laufende Weidegänge</div>
            <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-neutral-950">
              {dashboardData?.activeSessionsCount ?? '...'}
            </div>
          </CardContent>
        </Card>
        <Card variant="dashboard">
          <CardContent className="p-5">
            <div className="text-sm font-semibold text-neutral-800">Weidegänge gesamt</div>
            <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-neutral-950">
              {dashboardData?.sessionsCount ?? '...'}
            </div>
          </CardContent>
        </Card>
        <Card variant="dashboard">
          <CardContent className="p-5">
            <div className="text-sm font-semibold text-neutral-800">Aktive Pferch-Belegungen</div>
            <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-neutral-950">
              {dashboardData?.activeAssignmentsCount ?? '...'}
            </div>
          </CardContent>
        </Card>
        <Card variant="dashboard">
          <CardContent className="p-5">
            <div className="text-sm font-semibold text-neutral-800">Arbeit läuft</div>
            <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-neutral-950">
              {dashboardData?.activeWorkSessionsCount ?? '...'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
