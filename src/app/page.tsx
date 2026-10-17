'use client'

import {
  ChevronDown,
  ChevronRight,
  Download,
  DownloadCloud,
  Loader2,
  Map as MapIcon,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
import { useLiveQuery } from 'dexie-react-hooks'
import { Card, CardContent, CardDescription } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { BackupReminder } from '@/components/dashboard/backup-reminder'
import { ContinueRecordingCard } from '@/components/dashboard/continue-recording-card'
import { useSecureAreaPrefetch } from '@/components/dashboard/use-secure-area-prefetch'
import { getAppSettings } from '@/lib/db/repositories/settings'
import {
  listActiveEnclosures,
  listAllEnclosureAssignments,
} from '@/lib/db/repositories/enclosures'
import { listAllHerds } from '@/lib/db/repositories/herds'
import { listAllAnimals } from '@/lib/db/repositories/animals'
import {
  buildAnimalsByHerdId,
  getEffectiveHerdCount,
} from '@/lib/maps/live-position-map-enclosure-stats'
import { formatSince } from '@/lib/maps/live-position-map-formatters'
import { listAllSessions } from '@/lib/db/repositories/sessions'
import { listAllWorkSessions } from '@/lib/db/repositories/work-sessions'
import { defaultAppSettings } from '@/lib/settings/defaults'
import { triggerHaptic } from '@/hooks/use-haptic-feedback'
import { cn } from '@/lib/utils/cn'

function DashboardStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[1.1rem] border border-border bg-surface-raised px-4 py-3">
      <div className="text-sm font-semibold text-ink-soft">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-ink-strong">{value}</div>
    </div>
  )
}

type HerdStatus = {
  id: string
  name: string
  count: number | null
  enclosureName: string | null
  since: string | null
}

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
    const [herds, enclosures, sessions, assignments, workSessions, animals] = await Promise.all([
      listAllHerds(),
      listActiveEnclosures(),
      listAllSessions(),
      listAllEnclosureAssignments(),
      listAllWorkSessions(),
      listAllAnimals(),
    ])

    const enclosureNames = new Map(enclosures.map((enclosure) => [enclosure.id, enclosure.name]))
    const openAssignmentByHerd = new Map(
      assignments
        .filter((assignment) => !assignment.endTime)
        .map((assignment) => [assignment.herdId, assignment])
    )
    const animalsByHerd = buildAnimalsByHerdId(animals)
    const herdStatuses: HerdStatus[] = herds
      .filter((herd) => !herd.isArchived)
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
      .map((herd) => {
        const assignment = openAssignmentByHerd.get(herd.id)
        return {
          id: herd.id,
          name: herd.name,
          count: getEffectiveHerdCount(herd, animalsByHerd.get(herd.id) ?? []),
          enclosureName: assignment ? (enclosureNames.get(assignment.enclosureId) ?? 'Pferch') : null,
          since: assignment?.startTime ?? null,
        }
      })

    return {
      herdStatuses,
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

  const settings = useLiveQuery(() => getAppSettings(), [])
  const secureArea = useSecureAreaPrefetch({
    baseLayer: settings?.mapBaseLayer ?? defaultAppSettings.mapBaseLayer,
    tileCachingEnabled: settings?.tileCachingEnabled ?? defaultAppSettings.tileCachingEnabled,
  })

  return (
    <div className="space-y-4">
      <BackupReminder />

      <ContinueRecordingCard />

      {/* Where every herd stands right now — the question the shepherd opens
          the app with. Replaces five tiles that only repeated the bottom nav. */}
      <section aria-labelledby="herds-now" className="app-panel p-4 md:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="herds-now" className="text-xl font-bold text-ink-strong">
            Herden jetzt
          </h2>
          <Link
            href="/enclosures"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-ink underline decoration-border-strong underline-offset-4"
          >
            Pferche
          </Link>
        </div>

        {dashboardData && dashboardData.herdStatuses.length === 0 ? (
          <div className="mt-3 rounded-[1.1rem] border-2 border-dashed border-border px-4 py-4">
            <p className="text-base font-semibold text-ink-strong">Noch keine Herde angelegt.</p>
            <Link
              href="/herds"
              className="mt-3 inline-flex min-h-11 items-center rounded-full border-2 border-primary px-4 font-semibold text-ink-strong"
            >
              Herde anlegen
            </Link>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border-soft">
            {(dashboardData?.herdStatuses ?? []).map((herd) => (
              <li key={herd.id}>
                <Link
                  href={`/herd?id=${encodeURIComponent(herd.id)}`}
                  onClick={() => triggerHaptic('light')}
                  className="flex min-h-16 items-center gap-3 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-bold leading-tight text-ink-strong [overflow-wrap:anywhere]">
                      {herd.name}
                    </span>
                    <span className="mt-0.5 block text-sm font-medium text-ink-muted">
                      {herd.enclosureName
                        ? [herd.enclosureName, formatSince(herd.since)].filter(Boolean).join(' · ')
                        : 'In keinem Pferch'}
                    </span>
                  </span>
                  {herd.count !== null ? (
                    <span className="shrink-0 text-right">
                      <span className="block text-xl font-bold tabular-nums text-ink-strong">
                        {herd.count}
                      </span>
                      <span className="block text-xs font-semibold text-ink-muted">Tiere</span>
                    </span>
                  ) : null}
                  <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-ink-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {dashboardData && dashboardData.activeSessionsCount === 0 && dashboardData.herdStatuses.length > 0 ? (
          <Link
            href="/sessions"
            onClick={() => triggerHaptic('light')}
            className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-[1.25rem] border-2 border-primary bg-primary px-4 text-lg font-bold text-primary-foreground transition-colors hover:bg-chrome-strong"
          >
            <MapIcon aria-hidden="true" className="h-5 w-5" strokeWidth={2.4} />
            Weidegang starten
          </Link>
        ) : null}

        <div className="mt-4 hidden flex-wrap gap-2 md:flex">
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
              <h2 className="text-lg font-bold text-ink-strong">Karte offline sichern</h2>
              <CardDescription className="mt-0.5">
                Kartenbereich um deinen Standort speichern, solange noch Netz da ist.
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
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-lg font-bold text-ink-strong [&::-webkit-details-marker]:hidden">
          Übersicht
          <ChevronDown
            aria-hidden="true"
            className="h-5 w-5 text-ink-muted transition-transform group-open:rotate-180"
          />
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
