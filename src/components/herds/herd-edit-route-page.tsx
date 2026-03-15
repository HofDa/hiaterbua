'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/dexie'
import { nowIso } from '@/lib/utils/time'
import type { Herd } from '@/types/domain'

type HerdEditRoutePageProps = {
  herdId: string | null
}

export function HerdEditRoutePage({ herdId }: HerdEditRoutePageProps) {
  const herd = useLiveQuery(() => (herdId ? db.herds.get(herdId) : undefined), [herdId])

  if (!herdId) {
    return (
      <div className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
        Herde nicht angegeben.
      </div>
    )
  }

  if (herd === undefined) {
    return (
      <div className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
        Lade Daten …
      </div>
    )
  }

  if (!herd) {
    return (
      <div className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
        Herde nicht gefunden.
      </div>
    )
  }

  return <EditHerdForm herd={herd} herdId={herdId} />
}

function EditHerdForm({ herd, herdId }: { herd: Herd; herdId: string }) {
  const [name, setName] = useState(herd.name)
  const [fallbackCount, setFallbackCount] = useState(
    herd.fallbackCount === null || herd.fallbackCount === undefined
      ? ''
      : String(herd.fallbackCount)
  )
  const [notes, setNotes] = useState(herd.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    setSaved(false)
    setError('')

    try {
      await db.herds.update(herdId, {
        name: name.trim(),
        fallbackCount: fallbackCount.trim() ? Number(fallbackCount) : null,
        notes: notes.trim() || undefined,
        updatedAt: nowIso(),
      })

      setSaved(true)
    } catch {
      setError('Änderungen konnten nicht gespeichert werden.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
        <h1 className="text-2xl font-semibold">Herde bearbeiten</h1>
        <p className="mt-2 text-sm text-neutral-600">{herd.name}</p>
      </section>

      <section className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
        <form className="space-y-4" onSubmit={handleSave}>
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Geschätzte Anzahl (optional)
            </label>
            <input
              className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
              type="number"
              min="0"
              value={fallbackCount}
              onChange={(event) => setFallbackCount(event.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Notiz</label>
            <textarea
              className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          {saved ? (
            <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
              Änderungen gespeichert.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-4 py-3 font-medium text-[#17130f] disabled:opacity-50"
            >
              {saving ? 'Speichert …' : 'Speichern'}
            </button>

            <Link
              href={`/herd?id=${encodeURIComponent(herdId)}`}
              className="rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 font-medium text-[#17130f]"
            >
              Zurück
            </Link>
          </div>
        </form>
      </section>
    </div>
  )
}
