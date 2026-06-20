'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLiveQuery } from 'dexie-react-hooks'
import { ErrorAlert } from '@/components/ui/alert'
import { useConfirm } from '@/components/ui/confirm-dialog'
import {
  FormButton,
  FormField,
  FormInput,
  FormLabel,
  FormTextarea,
} from '@/components/ui/form'
import { MetaLabel, metaLabelClassName } from '@/components/ui/typography'
import { assertUpdated } from '@/lib/db/assert-updated'
import { deleteHerdCascade } from '@/lib/db/delete-herd'
import { listAllAnimals } from '@/lib/db/repositories/animals'
import {
  createHerdRecord,
  listHerdsByRecent,
  updateHerdRecord,
} from '@/lib/db/repositories/herds'
import type { Herd, Species } from '@/types/domain'

const speciesLabels: Record<Species, string> = {
  cattle: 'Rinder',
  sheep: 'Schafe',
  goats: 'Ziegen',
  horses: 'Pferde',
  other: 'Andere',
}

export default function HerdsPage() {
  const confirm = useConfirm()
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

          return count > 0 ? `${count} ${label}` : null
        })
        .filter(Boolean) as string[]

      return {
        ...herd,
        displayCount:
          activeAnimals.length > 0 ? activeAnimals.length : (herd.fallbackCount ?? 0),
        hasIndividualAnimals: activeAnimals.length > 0,
        speciesSummary,
      }
    })
  }, [])

  const [name, setName] = useState('')
  const [fallbackCount, setFallbackCount] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState('')
  const [actionError, setActionError] = useState('')

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

  async function toggleArchive(herdId: string, nextState: boolean) {
    setActionError('')

    try {
      const updatedCount = await updateHerdRecord(herdId, {
        isArchived: nextState,
      })

      assertUpdated(updatedCount, 'Herde wurde nicht gefunden.')
    } catch {
      setActionError('Herde konnte nicht aktualisiert werden.')
    }
  }

  async function deleteHerd(herd: Herd) {
    const confirmed = await confirm({
      title: `Herde "${herd.name}" löschen?`,
      description:
        'Tiere, Weidegänge, Arbeitseinsätze und Belegungen dieser Herde werden ebenfalls entfernt.',
      confirmLabel: 'Löschen',
      destructive: true,
    })

    if (!confirmed) return

    setActionError('')

    try {
      await deleteHerdCascade(herd.id)
    } catch {
      setActionError('Herde konnte nicht gelöscht werden.')
    }
  }

  return (
    <div className="space-y-5">
      <section className="app-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <MetaLabel tracking="wide">
              Herde
            </MetaLabel>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">Bestehende Herde öffnen</h1>
          </div>
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

        {actionError ? <ErrorAlert className="rounded-[1.25rem]">{actionError}</ErrorAlert> : null}

        {!herds ? (
          <div className="app-panel-sm p-5">Lade Daten …</div>
        ) : herds.length === 0 ? (
          <div className="app-panel-sm p-5 text-ink-soft">
            <div className="text-base font-semibold text-ink-strong">Noch keine Herde vorhanden</div>
            <div className="mt-2 text-sm font-medium text-ink-soft">
              Über `Neue Herde` legst du den ersten Bestand an.
            </div>
          </div>
        ) : (
          herds.map((herd) => (
            <article key={herd.id} className="app-panel-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-xl font-semibold tracking-[-0.02em] text-ink-strong">{herd.name}</h3>
                </div>
                <FormButton
                  type="button"
                  variant="secondary"
                  onClick={() => toggleArchive(herd.id, !herd.isArchived)}
                  className="rounded-full border border-border-soft bg-surface-muted px-3 py-2 text-sm font-semibold text-ink-strong shadow-sm"
                >
                  {herd.isArchived ? 'Aktivieren' : 'Archivieren'}
                </FormButton>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="app-surface-row px-4 py-3">
                  <MetaLabel>
                    Tiere
                  </MetaLabel>
                  <div className="mt-1 text-lg font-semibold text-ink-strong">{herd.displayCount}</div>
                </div>
                <div className="app-surface-row px-4 py-3">
                  <MetaLabel>
                    Erfassung
                  </MetaLabel>
                  <div className="mt-1 text-sm font-semibold text-ink-strong">
                    {herd.hasIndividualAnimals ? 'Einzeltiere' : 'Schätzwert'}
                  </div>
                </div>
                <div className="app-surface-row px-4 py-3">
                  <MetaLabel>
                    Status
                  </MetaLabel>
                  <div className="mt-1 text-sm font-semibold text-ink-strong">
                    {herd.isArchived ? 'Archiviert' : 'Aktiv'}
                  </div>
                </div>
              </div>

              {herd.speciesSummary.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {herd.speciesSummary.map((entry) => (
                    <div
                      key={entry}
                      className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-sm font-medium text-ink"
                    >
                      {entry}
                    </div>
                  ))}
                </div>
              ) : null}

              {herd.notes ? (
                <div className="mt-3 rounded-[1.1rem] border border-border bg-surface-raised px-4 py-3 text-sm font-medium text-ink">
                  {herd.notes}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/herd?id=${encodeURIComponent(herd.id)}`}
                  className="min-w-[9rem] rounded-[1.1rem] border-2 border-border-strong bg-surface-muted px-5 py-3 text-sm font-semibold text-ink-strong app-shadow-action"
                >
                  Herde öffnen & bearbeiten
                </Link>
              </div>

              <div className="mt-4 rounded-[1.1rem] border border-error-border/70 bg-error-surface/90 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className={metaLabelClassName({ tone: 'error' })}>
                      Kritische Aktion
                    </div>
                    <div className="mt-1 text-sm font-medium text-error-ink">
                      Herde dauerhaft löschen
                    </div>
                  </div>
                  <FormButton
                    type="button"
                    variant="danger"
                    onClick={() => void deleteHerd(herd)}
                    className="rounded-[1.1rem] border border-error-border bg-surface-raised px-4 py-3 text-sm font-semibold text-error-ink shadow-sm"
                  >
                    Löschen
                  </FormButton>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  )
}
