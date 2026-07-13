'use client'

import {
  Briefcase,
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
import { ContinueRecordingCard } from '@/components/dashboard/continue-recording-card'
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
      <CardContent className="p-4">
        <div className="text-sm font-semibold text-ink-soft">{label}</div>
        <div className="mt-1 text-2xl font-semibold text-ink-strong">{value}</div>
      </CardContent>
    </Card>
  )
}

type FieldStartLink = {
  href: string
  title: string
  icon: LucideIcon
}

// Icon + title only: the four destinations are used daily, so descriptions are
// onboarding text that would cost a screen of scroll on every open.
const fieldStartLinks = [
  { href: '/work', title: 'Arbeit', icon: Briefcase },
  { href: '/sessions', title: 'Weidegang', icon: Map },
  { href: '/enclosures', title: 'Pferch', icon: MapPin },
  { href: '/herds', title: 'Herde', icon: Users },
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
    <div className="space-y-4">
      <BackupReminder />

      <ContinueRecordingCard />

      <section className="space-y-3 md:app-panel md:p-5">
        <CardTitle
          className={metaLabelClassName({ tracking: 'wider', tone: 'soft' }, 'px-1 md:px-0')}
        >
          Feldstart
        </CardTitle>

        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          {fieldStartLinks.map((link) => {
            const Icon = link.icon

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => triggerHaptic('light')}
                className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-[1.15rem] border-2 border-border-ink bg-surface-raised px-3 py-3.5 text-ink app-shadow-action transition-colors hover:bg-surface-hover md:rounded-[1.35rem]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-accent text-primary">
                  <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={2.2} />
                </span>
                <span className="block max-w-full truncate text-base font-semibold leading-tight text-ink-strong">
                  {link.title}
                </span>
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
        <CardContent className="flex flex-col gap-2.5 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="min-w-0 flex-1 basis-52">
              <CardTitle className={metaLabelClassName({ tracking: 'wider', tone: 'soft' })}>
                Einsatzbereit
              </CardTitle>
              <CardDescription className="mt-0.5">
                Kartenbereich sichern, solange noch Netz da ist.
              </CardDescription>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
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

      {/* Counts are review/admin info, not field info — collapsed by default so
          the field controls above stay within one screen. */}
      <details className="app-panel-sm group px-4 py-3">
        <summary
          className={metaLabelClassName(
            { tracking: 'wider', tone: 'soft' },
            'flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden',
          )}
        >
          Übersicht
          <span
            aria-hidden="true"
            className="text-base font-semibold text-ink-muted transition-transform group-open:rotate-180"
          >
            ⌄
          </span>
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <DashboardStat label="Aktive Herden" value={dashboardData?.herdsCount ?? '...'} />
          <DashboardStat label="Pferche" value={dashboardData?.enclosuresCount ?? '...'} />
          <DashboardStat label="Laufende Weidegänge" value={dashboardData?.activeSessionsCount ?? '...'} />
          <DashboardStat label="Weidegänge gesamt" value={dashboardData?.sessionsCount ?? '...'} />
          <DashboardStat label="Aktive Pferch-Belegungen" value={dashboardData?.activeAssignmentsCount ?? '...'} />
          <DashboardStat label="Arbeit läuft" value={dashboardData?.activeWorkSessionsCount ?? '...'} />
        </div>
      </details>
    </div>
  )
}
