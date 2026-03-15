'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/dexie'
import { deleteHerdCascade } from '@/lib/db/delete-herd'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type { Herd, Species } from '@/types/domain'

const speciesLabels: Record<Species, string> = {
  cattle: 'Rinder',
  sheep: 'Schafe',
  goats: 'Ziegen',
  horses: 'Pferde',
  other: 'Andere',
}

export default function HerdsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const herds = useLiveQuery(async () => {
    const herdList = await db.herds.orderBy('updatedAt').reverse().toArray()
    const allAnimals = await db.animals.toArray()

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

  async function handleCreateHerd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    setCreateError('')
    const timestamp = nowIso()

    const herd: Herd = {
      id: createId('herd'),
      name: name.trim(),
      fallbackCount: fallbackCount.trim() ? Number(fallbackCount) : null,
      notes: notes.trim() || undefined,
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    try {
      await db.herds.add(herd)

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
    await db.herds.update(herdId, {
      isArchived: nextState,
      updatedAt: nowIso(),
    })
  }

  async function deleteHerd(herd: Herd) {
    const confirmed = window.confirm(
      `Herde "${herd.name}" wirklich löschen? Tiere, Weidegänge, Arbeitseinsätze und Belegungen dieser Herde werden ebenfalls entfernt.`
    )

    if (!confirmed) return

    await deleteHerdCascade(herd.id)
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-700">
              Herde
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">Bestehende Herde öffnen</h1>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen((current) => !current)}
            aria-expanded={isCreateOpen}
            className="rounded-full border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-2 text-sm font-semibold text-neutral-950 shadow-sm"
          >
            {isCreateOpen ? 'Neu schließen' : 'Neue Herde'}
          </button>
        </div>
      </section>

      {isCreateOpen ? (
        <section className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.02em]">Neue Herde anlegen</h2>
              <p className="mt-1 text-sm font-medium text-neutral-800">
                Name eingeben, optional Anzahl setzen, speichern.
              </p>
            </div>
            <div className="rounded-full border border-[#ccb98a] bg-[#fffdf6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-950">
              Verwaltung
            </div>
          </div>

          <form className="mt-4 space-y-4" onSubmit={handleCreateHerd}>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">Name</label>
              <input
                className="w-full rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm outline-none transition focus:border-[#5a5347] focus:ring-4 focus:ring-[#5a5347]/10"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. Alm Nord"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">
                Geschätzte Anzahl (optional)
              </label>
              <input
                className="w-full rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm outline-none transition focus:border-[#5a5347] focus:ring-4 focus:ring-[#5a5347]/10"
                type="number"
                min="0"
                value={fallbackCount}
                onChange={(e) => setFallbackCount(e.target.value)}
                placeholder="z. B. 35"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">Notiz</label>
              <textarea
                className="w-full rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm outline-none transition focus:border-[#5a5347] focus:ring-4 focus:ring-[#5a5347]/10"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optionale Bemerkungen"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-[1.25rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-4 font-medium text-neutral-950 shadow-[0_12px_24px_rgba(40,34,26,0.08)] disabled:opacity-50"
            >
              {saving ? 'Speichert …' : 'Herde speichern'}
            </button>

            {createError ? (
              <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                {createError}
              </div>
            ) : null}
          </form>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-[-0.02em]">Herden</h2>
          {herds ? (
            <div className="rounded-full border border-[#ccb98a] bg-[#fffdf6] px-3 py-1 text-sm font-semibold text-neutral-950">
              {herds.length}
            </div>
          ) : null}
        </div>

        {!herds ? (
          <div className="rounded-[1.75rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">Lade Daten …</div>
        ) : herds.length === 0 ? (
          <div className="rounded-[1.75rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 text-neutral-800 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
            <div className="text-base font-semibold text-neutral-950">Noch keine Herde vorhanden</div>
            <div className="mt-2 text-sm font-medium text-neutral-800">
              Über `Neue Herde` legst du den ersten Bestand an.
            </div>
          </div>
        ) : (
          herds.map((herd) => (
            <article key={herd.id} className="rounded-[1.75rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-xl font-semibold tracking-[-0.02em] text-neutral-950">{herd.name}</h3>
                </div>
                <button
                  onClick={() => toggleArchive(herd.id, !herd.isArchived)}
                  className="rounded-full border border-stone-300 bg-stone-100 px-3 py-2 text-sm font-semibold text-neutral-950 shadow-sm"
                >
                  {herd.isArchived ? 'Aktivieren' : 'Archivieren'}
                </button>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-700">
                    Tiere
                  </div>
                  <div className="mt-1 text-lg font-semibold text-neutral-950">{herd.displayCount}</div>
                </div>
                <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-700">
                    Erfassung
                  </div>
                  <div className="mt-1 text-sm font-semibold text-neutral-950">
                    {herd.hasIndividualAnimals ? 'Einzeltiere' : 'Schätzwert'}
                  </div>
                </div>
                <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-700">
                    Status
                  </div>
                  <div className="mt-1 text-sm font-semibold text-neutral-950">
                    {herd.isArchived ? 'Archiviert' : 'Aktiv'}
                  </div>
                </div>
              </div>

              {herd.speciesSummary.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {herd.speciesSummary.map((entry) => (
                    <div
                      key={entry}
                      className="rounded-full border border-[#ccb98a] bg-[#fffdf6] px-3 py-1.5 text-sm font-medium text-neutral-900"
                    >
                      {entry}
                    </div>
                  ))}
                </div>
              ) : null}

              {herd.notes ? (
                <div className="mt-3 rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-neutral-900">
                  {herd.notes}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/herd?id=${encodeURIComponent(herd.id)}`}
                  className="min-w-[9rem] rounded-[1.1rem] border-2 border-[#5a5347] bg-[#f1efeb] px-5 py-3 text-sm font-semibold text-neutral-950 shadow-[0_12px_24px_rgba(40,34,26,0.08)]"
                >
                  Herde öffnen & bearbeiten
                </Link>
              </div>

              <div className="mt-4 rounded-[1.1rem] border border-red-200/70 bg-red-50/90 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-red-700">
                      Kritische Aktion
                    </div>
                    <div className="mt-1 text-sm font-medium text-red-900">
                      Herde dauerhaft löschen
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteHerd(herd)}
                    className="rounded-[1.1rem] border border-red-300 bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-red-800 shadow-sm"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  )
}
