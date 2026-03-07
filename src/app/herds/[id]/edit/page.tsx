'use client'

import Link from 'next/link'
import { use, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/dexie'
import { nowIso } from '@/lib/utils/time'
import type { Herd } from '@/types/domain'

export default function EditHerdPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const herd = useLiveQuery(() => db.herds.get(id), [id])

  if (herd === undefined) {
    return <div className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">Lade Daten …</div>
  }

  if (!herd) {
    return (
      <div className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
        Herde nicht gefunden.
      </div>
    )
  }

  return <EditHerdForm herd={herd} id={id} />
}

function EditHerdForm({ herd, id }: { herd: Herd; id: string }) {
  const [name, setName] = useState(herd.name)
  const [fallbackCount, setFallbackCount] = useState(
    herd.fallbackCount === null || herd.fallbackCount === undefined
      ? ''
      : String(herd.fallbackCount)
  )
  const [notes, setNotes] = useState(herd.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const safeHerd = herd

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    setSaved(false)

    await db.herds.update(id, {
      name: name.trim(),
      fallbackCount: fallbackCount.trim() ? Number(fallbackCount) : null,
      notes: notes.trim() || undefined,
      updatedAt: nowIso(),
    })

    setSaving(false)
    setSaved(true)
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
        <h1 className="text-2xl font-semibold">Herde bearbeiten</h1>
        <p className="mt-2 text-sm text-neutral-600">{safeHerd.name}</p>
      </section>

      <section className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
        <form className="space-y-4" onSubmit={handleSave}>
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              onChange={(e) => setFallbackCount(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Notiz</label>
            <textarea
              className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {saved ? (
            <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
              Änderungen gespeichert.
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
              href={`/herds/${id}`}
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
