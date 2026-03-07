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

  async function handleCreateHerd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
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

    await db.herds.add(herd)

    setName('')
    setFallbackCount('')
    setNotes('')
    setSaving(false)
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
      <section className="rounded-[1.9rem] border border-white/70 bg-[rgba(255,252,246,0.82)] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)] backdrop-blur">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Herden</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Herden anlegen und Einzeltiere pro Herde verwalten.
        </p>
      </section>

      <section className="rounded-[1.9rem] border border-white/70 bg-[rgba(255,252,246,0.82)] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)] backdrop-blur">
        <h2 className="text-lg font-semibold tracking-[-0.02em]">Neue Herde</h2>

        <form className="mt-4 space-y-4" onSubmit={handleCreateHerd}>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-800">Name</label>
            <input
              className="w-full rounded-[1.25rem] border border-white bg-white/80 px-4 py-3 shadow-sm outline-none transition focus:border-emerald-700/30 focus:ring-4 focus:ring-emerald-900/5"
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
              className="w-full rounded-[1.25rem] border border-white bg-white/80 px-4 py-3 shadow-sm outline-none transition focus:border-emerald-700/30 focus:ring-4 focus:ring-emerald-900/5"
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
              className="w-full rounded-[1.25rem] border border-white bg-white/80 px-4 py-3 shadow-sm outline-none transition focus:border-emerald-700/30 focus:ring-4 focus:ring-emerald-900/5"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optionale Bemerkungen"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-[1.25rem] bg-[linear-gradient(135deg,#1f6a49,#164c35)] px-4 py-4 font-medium text-white shadow-[0_12px_24px_rgba(31,106,73,0.22)] disabled:opacity-50"
          >
            {saving ? 'Speichert …' : 'Herde speichern'}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-[-0.02em]">Vorhandene Herden</h2>

        {!herds ? (
          <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,252,246,0.82)] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)] backdrop-blur">Lade Daten …</div>
        ) : herds.length === 0 ? (
          <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,252,246,0.82)] p-5 text-neutral-600 shadow-[0_18px_40px_rgba(23,20,18,0.08)] backdrop-blur">
            Noch keine Herden vorhanden.
          </div>
        ) : (
          herds.map((herd) => (
            <article key={herd.id} className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,252,246,0.82)] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)] backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold tracking-[-0.02em]">{herd.name}</h3>

                  <p className="text-sm text-neutral-600">
                    {herd.displayCount} Tiere
                    {herd.hasIndividualAnimals ? ' (Einzeltiere erfasst)' : ' (Schätzwert/leer)'}
                  </p>

                  {herd.speciesSummary.length > 0 ? (
                    <p className="mt-2 text-sm text-neutral-700">
                      {herd.speciesSummary.join(' · ')}
                    </p>
                  ) : null}

                  {herd.notes ? (
                    <p className="mt-2 text-sm text-neutral-700">{herd.notes}</p>
                  ) : null}
                </div>

                <button
                  onClick={() => toggleArchive(herd.id, !herd.isArchived)}
                  className="rounded-full border border-white bg-white/85 px-3 py-2 text-sm shadow-sm"
                >
                  {herd.isArchived ? 'Aktivieren' : 'Archivieren'}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/herds/${herd.id}`}
                  className="rounded-[1.1rem] bg-[linear-gradient(135deg,#1f6a49,#164c35)] px-4 py-3 text-sm font-medium text-white shadow-[0_12px_24px_rgba(31,106,73,0.18)]"
                >
                  Öffnen
                </Link>

                <Link
                  href={`/herds/${herd.id}/edit`}
                  className="rounded-[1.1rem] border border-white bg-white/85 px-4 py-3 text-sm font-medium shadow-sm"
                >
                  Bearbeiten
                </Link>

                <button
                  type="button"
                  onClick={() => void deleteHerd(herd)}
                  className="rounded-[1.1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 shadow-sm"
                >
                  Löschen
                </button>
              </div>

              <div className="mt-3 text-xs text-neutral-500">
                Status: {herd.isArchived ? 'archiviert' : 'aktiv'}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  )
}
