'use client'

import {
  Briefcase,
  ChevronRight,
  Download,
  DownloadCloud,
  Loader2,
  Map,
  MapPin,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useLiveQuery } from 'dexie-react-hooks'
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { BackupReminder } from '@/components/dashboard/backup-reminder'
import { useSecureAreaPrefetch } from '@/components/dashboard/use-secure-area-prefetch'
import { metaLabelClassName } from '@/components/ui/typography'
import { db } from '@/lib/db/dexie'
import { listActiveEnclosures } from '@/lib/db/repositories/enclosures'
import { listAllHerds } from '@/lib/db/repositories/herds'
import { listAllSessions } from '@/lib/db/repositories/sessions'
import { listAllWorkSessions } from '@/lib/db/repositories/work-sessions'
import { defaultAppSettings } from '@/lib/settings/defaults'
import { triggerHaptic } from '@/hooks/use-haptic-feedback'
import { cn } from '@/lib/utils/cn'

function DashboardStat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card variant="dashboard">
      <CardContent className="p-5">
        <div className="text-sm font-semibold text-ink-soft">{label}</div>
        <div className="mt-2 text-3xl font-semibold text-ink-strong">{value}</div>
      </CardContent>
    </Card>
  )
}

type FieldStartLink = {
  href: string
  title: string
  description: string
  icon: LucideIcon
}

const fieldStartLinks = [
  {
    href: '/work',
    title: 'Arbeit',
    description: 'Arbeitszeit im Feld mit Erinnerung erfassen.',
    icon: Briefcase,
  },
  {
    href: '/sessions',
    title: 'Weidegang',
    description: 'Geführten Weidegang direkt starten oder fortsetzen.',
    icon: Map,
  },
  {
    href: '/enclosures',
    title: 'Pferch',
    description: 'Pferch zeichnen, Walk starten und Belegung prüfen.',
    icon: MapPin,
  },
  {
    href: '/herds',
    title: 'Herde',
    description: 'Herde öffnen, Tiere prüfen und Belegungen anpassen.',
    icon: Users,
  },
] satisfies FieldStartLink[]

const utilityLinks = [
  {
    href: '/export',
    label: 'Im-/Export',
    icon: Download,
  },
  {
    href: '/settings',
    label: 'Einstellungen',
    icon: Settings,
  },
]

export default function HomePage() {
  const dashboardData = useLiveQuery(async () => {
    const [herds, enclosures, sessions, assignments, workSessions] = await Promise.all([
      listAllHerds(),
      listActiveEnclosures(),
      listAllSessions(),
      db.enclosureAssignments.toArray(),
      listAllWorkSessions(),
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

  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const secureArea = useSecureAreaPrefetch({
    baseLayer: settings?.mapBaseLayer ?? defaultAppSettings.mapBaseLayer,
    tileCachingEnabled: settings?.tileCachingEnabled ?? defaultAppSettings.tileCachingEnabled,
  })

  return (
    <div className="space-y-5">
      <BackupReminder />

      <section className="space-y-3 md:app-panel md:p-5">
        <div className="px-1 md:px-0">
          <CardTitle className={metaLabelClassName({ tracking: 'wider', tone: 'soft' })}>
            Feldstart
          </CardTitle>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink-strong md:text-xl">
            Direkt loslegen
          </h2>
        </div>

        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
          {fieldStartLinks.map((link) => {
            const Icon = link.icon

            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex min-h-24 items-center gap-3 rounded-[1.15rem] border-2 border-border-ink bg-surface-raised px-3.5 py-3.5 text-ink app-shadow-action transition-colors hover:bg-surface-hover md:min-h-28 md:rounded-[1.35rem] md:px-4 md:py-4"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-accent text-primary">
                  <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold leading-tight text-ink-strong">
                    {link.title}
                  </span>
                  <span className="mt-1 block text-sm font-medium leading-snug text-ink-muted">
                    {link.description}
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-ink-muted" />
              </Link>
            )
          })}
        </div>

        <div className="hidden flex-wrap gap-2 md:flex">
          {utilityLinks.map((link) => {
            const Icon = link.icon

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(buttonVariants({ variant: 'secondary' }), 'gap-2 rounded-full')}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {link.label}
              </Link>
            )
          })}
        </div>
      </section>

      <Card>
        <CardContent className="flex flex-col gap-3 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className={metaLabelClassName({ tracking: 'wider', tone: 'soft' })}>
                Einsatzbereit
              </CardTitle>
              <CardDescription className="mt-1">
                Vor dem Aufstieg den Kartenbereich sichern, solange noch Netz da ist.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light')
                  secureArea.secureCurrentArea()
                }}
                disabled={secureArea.isBusy}
                className={cn(
                  buttonVariants({ variant: 'default' }),
                  'min-h-11 gap-2 rounded-full disabled:opacity-60',
                )}
              >
                {secureArea.isBusy ? (
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                ) : (
                  <DownloadCloud aria-hidden="true" className="h-4 w-4" />
                )}
                {secureArea.status === 'locating'
                  ? 'Standort …'
                  : secureArea.status === 'prefetching'
                    ? 'Sichert …'
                    : 'Kartenbereich sichern'}
              </button>
              {secureArea.status === 'prefetching' ? (
                <button
                  type="button"
                  onClick={secureArea.cancelPrefetch}
                  className={cn(
                    buttonVariants({ variant: 'secondary' }),
                    'min-h-11 rounded-full',
                  )}
                >
                  Abbrechen
                </button>
              ) : null}
              <Link
                href="/settings"
                className={cn(buttonVariants({ variant: 'secondary' }), 'min-h-11 rounded-full')}
              >
                Offline & GPS prüfen
              </Link>
            </div>
          </div>

          {(secureArea.message || secureArea.progress) && (
            <p
              aria-live="polite"
              className={cn(
                'text-sm font-medium',
                secureArea.status === 'error'
                  ? 'text-error-ink'
                  : secureArea.status === 'done'
                    ? 'text-success-ink'
                    : 'text-ink-muted',
              )}
            >
              {secureArea.progress
                ? `Sichert ${secureArea.progress.completed} / ${secureArea.progress.total} Tiles …`
                : secureArea.message}
            </p>
          )}
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
