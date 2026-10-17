'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ErrorAlert } from '@/components/ui/alert'
import {
  FormButton,
  FormField,
  FormInput,
  FormLabel,
  FormTextarea,
} from '@/components/ui/form'
import { metaLabelClassName } from '@/components/ui/typography'
import { listAllAnimals } from '@/lib/db/repositories/animals'
import { getEffectiveHerdCount } from '@/lib/maps/live-position-map-enclosure-stats'
import { pluralize } from '@/lib/utils/format'
import {
  createHerdRecord,
  listHerdsByRecent,
} from '@/lib/db/repositories/herds'
import type { Species } from '@/types/domain'

// [singular, plural]: "1 Schaf", "12 Schafe".
const speciesLabels: Record<Species, [string, string]> = {
  cattle: ['Rind', 'Rinder'],
  sheep: ['Schaf', 'Schafe'],
  goats: ['Ziege', 'Ziegen'],
  horses: ['Pferd', 'Pferde'],
  other: ['anderes Tier', 'andere Tiere'],
}

function describeHerdCount(registered: number, estimate: number | null) {
  if (registered > 0 && estimate !== null && estimate > registered) {
    return `geschätzt · ${registered} mit Ohrmarke erfasst`
  }
  if (registered > 0) return 'alle mit Ohrmarke erfasst'
  return estimate !== null ? 'geschätzt' : 'noch keine Anzahl'
}

export default function HerdsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const herds = useLiveQuery(async () => {
    const herdList = await listHerdsByRecent()
    const allAnimals = await listAllAnimals()

    return herdList.map((herd) => {
      const activeAnimals = allAnimals.filter(
        (animal) => animal.herdId === herd.id && !animal.isArchived
      )

      const speciesSummary = Object.entries(speciesLabels)
        .map(([species, label]) => {
          const count = activeAnimals.filter(
            (animal) => animal.species === species
          ).length

          return count > 0 ? pluralize(count, label[0], label[1]) : null
        })
        .filter(Boolean) as string[]

      return {
        ...herd,
        // Same rule as Start and the Pferche: the estimate is the whole flock,
        // registered animals are a subset (this list used to show 1 for 42).
        displayCount: getEffectiveHerdCount(herd, activeAnimals),
        registeredCount: activeAnimals.length,
        speciesSummary,
      }
    })
  }, [])

  const [name, setName] = useState('')
  const [fallbackCount, setFallbackCount] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState('')

  async function handleCreateHerd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    setCreateError('')

    try {
      await createHerdRecord({
        name,
        fallbackCount: fallbackCount.trim() ? Number(fallbackCount) : null,
        notes,
      })

      setName('')
      setFallbackCount('')
      setNotes('')
    } catch {
      setCreateError('Herde konnte nicht gespeichert werden.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* The top bar already titles the page; the h1 is for screen readers. */}
      <section>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <h1 className="sr-only">Herden</h1>
          <FormButton
            type="button"
            onClick={() => setIsCreateOpen((current) => !current)}
            aria-expanded={isCreateOpen}
            className="rounded-full border-2 border-border bg-surface-raised px-4 py-2 text-sm font-semibold text-ink-strong shadow-sm"
          >
            {isCreateOpen ? 'Neu schließen' : 'Neue Herde'}
          </FormButton>
        </div>
      </section>

      {isCreateOpen ? (
        <section className="app-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.02em]">Neue Herde anlegen</h2>
              <p className="mt-1 text-sm font-medium text-ink-soft">
                Name eingeben, optional Anzahl setzen, speichern.
              </p>
            </div>
            <div
              className={metaLabelClassName(
                { tone: 'strong' },
                'rounded-full border border-border bg-surface-raised px-3 py-1',
              )}
            >
              Verwaltung
            </div>
          </div>

          <form className="mt-4 space-y-4" onSubmit={handleCreateHerd}>
            <FormField>
              <FormLabel className="text-ink-soft">Name</FormLabel>
              <FormInput
                className="rounded-[1.25rem] outline-none transition focus:border-border-strong focus:ring-4 focus:ring-border-strong/10"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. Alm Nord"
              />
            </FormField>

            <FormField>
              <FormLabel className="text-ink-soft">
                Geschätzte Anzahl (optional)
              </FormLabel>
              <FormInput
                className="rounded-[1.25rem] outline-none transition focus:border-border-strong focus:ring-4 focus:ring-border-strong/10"
                type="number"
                min="0"
                value={fallbackCount}
                onChange={(e) => setFallbackCount(e.target.value)}
                placeholder="z. B. 35"
              />
            </FormField>

            <FormField>
              <FormLabel className="text-ink-soft">Notiz</FormLabel>
              <FormTextarea
                className="rounded-[1.25rem] outline-none transition focus:border-border-strong focus:ring-4 focus:ring-border-strong/10"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optionale Bemerkungen"
              />
            </FormField>

            <FormButton
              type="submit"
              isLoading={saving}
              className="w-full rounded-[1.25rem] px-4 py-4 font-medium"
            >
              {saving ? 'Speichert …' : 'Herde speichern'}
            </FormButton>

            {createError ? <ErrorAlert className="rounded-[1.25rem]">{createError}</ErrorAlert> : null}
          </form>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-[-0.02em]">Herden</h2>
          {herds ? (
            <div className="rounded-full border border-border bg-surface-raised px-3 py-1 text-sm font-semibold text-ink-strong">
              {herds.length}
            </div>
          ) : null}
        </div>


        {!herds ? (
          <div className="app-panel-sm p-5">Lade Daten …</div>
        ) : herds.length === 0 ? (
          <div className="app-panel-sm p-5 text-ink-soft">
            <div className="text-base font-semibold text-ink-strong">Noch keine Herde vorhanden</div>
            <div className="mt-2 text-sm font-medium text-ink-soft">
              Über „Neue Herde“ legst du den ersten Bestand an.
            </div>
          </div>
        ) : (
          herds.map((herd) => (
            <article key={herd.id} className="app-panel-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold tracking-[-0.02em] text-ink-strong [overflow-wrap:anywhere]">
                    {herd.name}
                  </h2>
                  <p className="mt-1 text-base text-ink">
                    <span className="text-2xl font-bold tabular-nums text-ink-strong">
                      {herd.displayCount ?? '–'}
                    </span>{' '}
                    {herd.displayCount === 1 ? 'Tier' : 'Tiere'}
                    <span className="block text-sm font-medium text-ink-muted">
                      {describeHerdCount(herd.registeredCount, herd.fallbackCount ?? null)}
                      {herd.isArchived ? ' · archiviert' : ''}
                    </span>
                  </p>
                </div>

              </div>

              {herd.speciesSummary.length > 0 ? (
                <p className="mt-2 text-sm font-medium text-ink-muted">
                  {herd.speciesSummary.join(' · ')}
                </p>
              ) : null}

              {herd.notes ? (
                <p className="mt-2 text-sm text-ink">{herd.notes}</p>
              ) : null}

              {/* Deleting lives in the herd detail only — not on every card
                  while just browsing the list. */}
              <Link
                href={`/herd?id=${encodeURIComponent(herd.id)}`}
                className="mt-4 flex min-h-12 w-full items-center justify-center gap-1 rounded-[1.1rem] border-2 border-border-strong bg-surface-raised px-5 text-base font-semibold text-ink-strong transition-colors hover:bg-surface-hover"
              >
                Herde öffnen
                <ChevronRight aria-hidden="true" className="h-5 w-5" />
              </Link>
            </article>
          ))
        )}
      </section>
    </div>
  )
}
