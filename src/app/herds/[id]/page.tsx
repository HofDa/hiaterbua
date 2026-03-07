'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLiveQuery } from 'dexie-react-hooks'
import { EarTagScanPanel } from '@/components/animals/ear-tag-scan-panel'
import { db } from '@/lib/db/dexie'
import { deleteHerdCascade } from '@/lib/db/delete-herd'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type { Animal, EnclosureAssignment, Species } from '@/types/domain'

const speciesOptions: { value: Species; label: string }[] = [
  { value: 'cattle', label: 'Rinder' },
  { value: 'sheep', label: 'Schafe' },
  { value: 'goats', label: 'Ziegen' },
  { value: 'horses', label: 'Pferde' },
  { value: 'other', label: 'Andere' },
]

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'unbekannt'
  return new Date(value).toLocaleString('de-DE')
}

function formatDurationFromIso(startTime: string | null | undefined, endTime?: string | null) {
  if (!startTime) return 'unbekannt'

  const startMs = new Date(startTime).getTime()
  const endMs = new Date(endTime ?? nowIso()).getTime()

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return 'unbekannt'
  }

  const totalMinutes = Math.round((endMs - startMs) / 1000 / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours <= 0) return `${minutes} min`
  return `${hours} h ${String(minutes).padStart(2, '0')} min`
}

function safeString(value: string | null | undefined) {
  return value?.trim() ?? ''
}

export default function HerdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const herd = useLiveQuery(() => db.herds.get(id), [id])
  const animals = useLiveQuery(
    () => db.animals.where('herdId').equals(id).toArray(),
    [id]
  )
  const enclosures = useLiveQuery(() => db.enclosures.orderBy('name').toArray(), [])
  const assignments = useLiveQuery(
    () => db.enclosureAssignments.where('herdId').equals(id).reverse().sortBy('updatedAt'),
    [id]
  )

  const [earTag, setEarTag] = useState('')
  const [species, setSpecies] = useState<Species>('sheep')
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [showArchived, setShowArchived] = useState(false)
  const [metaName, setMetaName] = useState('')
  const [metaFallbackCount, setMetaFallbackCount] = useState('')
  const [metaNotes, setMetaNotes] = useState('')
  const [metaSaving, setMetaSaving] = useState(false)
  const [metaSaved, setMetaSaved] = useState(false)
  const [editingAnimalId, setEditingAnimalId] = useState<string | null>(null)
  const [editEarTag, setEditEarTag] = useState('')
  const [editSpecies, setEditSpecies] = useState<Species>('sheep')
  const [editName, setEditName] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [selectedEnclosureId, setSelectedEnclosureId] = useState('')
  const [assignmentCount, setAssignmentCount] = useState('')
  const [assignmentNotes, setAssignmentNotes] = useState('')
  const [assignmentSaving, setAssignmentSaving] = useState(false)
  const [assignmentError, setAssignmentError] = useState('')
  const [endingAssignmentId, setEndingAssignmentId] = useState<string | null>(null)

  const safeAnimals = useMemo(() => animals ?? [], [animals])
  const safeEnclosures = useMemo(() => enclosures ?? [], [enclosures])
  const safeAssignments = useMemo(() => assignments ?? [], [assignments])
  const activeAnimalsCount = safeAnimals.filter((animal) => !animal.isArchived).length
  const effectiveHerdCount = activeAnimalsCount > 0 ? activeAnimalsCount : (herd?.fallbackCount ?? null)

  const visibleAnimals = useMemo(() => {
    return safeAnimals.filter((animal) => (showArchived ? true : !animal.isArchived))
  }, [safeAnimals, showArchived])

  const grouped = useMemo(() => {
    return speciesOptions.map((option) => ({
      ...option,
      animals: visibleAnimals.filter((animal) => animal.species === option.value),
    }))
  }, [visibleAnimals])

  const enclosuresById = useMemo(
    () => new Map(safeEnclosures.map((enclosure) => [enclosure.id, enclosure])),
    [safeEnclosures]
  )

  const activeAssignment = useMemo(
    () => safeAssignments.find((assignment) => !assignment.endTime) ?? null,
    [safeAssignments]
  )

  const currentEnclosure = useMemo(
    () => (activeAssignment ? enclosuresById.get(activeAssignment.enclosureId) ?? null : null),
    [activeAssignment, enclosuresById]
  )
  const metaDirty =
    metaName.trim() !== safeString(herd?.name) ||
    metaFallbackCount !==
      (herd?.fallbackCount === null || herd?.fallbackCount === undefined
        ? ''
        : String(herd.fallbackCount)) ||
    metaNotes.trim() !== safeString(herd?.notes)

  const recentAssignments = useMemo(() => safeAssignments.slice(0, 5), [safeAssignments])

  const availableEnclosures = useMemo(
    () =>
      safeEnclosures.filter(
        (enclosure) => !enclosure.herdId || enclosure.herdId === id || enclosure.id === selectedEnclosureId
      ),
    [id, safeEnclosures, selectedEnclosureId]
  )

  useEffect(() => {
    if (!editingAnimalId || !animals) return

    const animal = animals.find((a) => a.id === editingAnimalId)
    if (!animal) return

    setEditEarTag(animal.earTag)
    setEditSpecies(animal.species)
    setEditName(animal.name ?? '')
    setEditNotes(animal.notes ?? '')
    setEditError('')
  }, [editingAnimalId, animals])

  useEffect(() => {
    if (effectiveHerdCount === null || effectiveHerdCount === undefined) {
      setAssignmentCount('')
      return
    }

    setAssignmentCount(String(effectiveHerdCount))
  }, [effectiveHerdCount])

  useEffect(() => {
    if (!herd) return
    setMetaName(herd.name)
    setMetaFallbackCount(
      herd.fallbackCount === null || herd.fallbackCount === undefined
        ? ''
        : String(herd.fallbackCount)
    )
    setMetaNotes(herd.notes ?? '')
  }, [herd])

  if (herd === undefined || animals === undefined || enclosures === undefined || assignments === undefined) {
    return <div className="rounded-[1.75rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)]">Lade Daten …</div>
  }

  if (!herd) {
    return (
      <div className="rounded-[1.75rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)]">
        Herde nicht gefunden.
      </div>
    )
  }

  const safeHerd = herd

  async function handleAddAnimal(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const cleanedEarTag = earTag.trim()

    if (!cleanedEarTag) {
      setError('Bitte eine Ohrmarke eingeben.')
      return
    }

    const existing = await db.animals
      .where('earTag')
      .equalsIgnoreCase(cleanedEarTag)
      .first()

    if (existing) {
      setError('Diese Ohrmarke existiert bereits.')
      return
    }

    setSaving(true)

    const timestamp = nowIso()

    const animal: Animal = {
      id: createId('animal'),
      herdId: safeHerd.id,
      earTag: cleanedEarTag,
      species,
      name: name.trim() || undefined,
      notes: notes.trim() || undefined,
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    await db.animals.add(animal)

    setEarTag('')
    setSpecies('sheep')
    setName('')
    setNotes('')
    setSaving(false)
  }

  async function setAnimalArchived(animalId: string, isArchived: boolean) {
    await db.animals.update(animalId, {
      isArchived,
      updatedAt: nowIso(),
    })
  }

  async function deleteAnimal(animal: Animal) {
    const confirmed = window.confirm(
      `Tier "${animal.earTag}" wirklich aus der Herde löschen?`
    )

    if (!confirmed) return

    await db.animals.delete(animal.id)
  }

  function startEdit(animal: Animal) {
    setEditingAnimalId(animal.id)
    setEditEarTag(animal.earTag)
    setEditSpecies(animal.species)
    setEditName(animal.name ?? '')
    setEditNotes(animal.notes ?? '')
    setEditError('')
  }

  function cancelEdit() {
    setEditingAnimalId(null)
    setEditEarTag('')
    setEditSpecies('sheep')
    setEditName('')
    setEditNotes('')
    setEditError('')
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingAnimalId) return

    const cleanedEarTag = editEarTag.trim()

    if (!cleanedEarTag) {
      setEditError('Bitte eine Ohrmarke eingeben.')
      return
    }

    const existing = await db.animals
      .where('earTag')
      .equalsIgnoreCase(cleanedEarTag)
      .first()

    if (existing && existing.id !== editingAnimalId) {
      setEditError('Diese Ohrmarke existiert bereits.')
      return
    }

    setEditSaving(true)

    await db.animals.update(editingAnimalId, {
      earTag: cleanedEarTag,
      species: editSpecies,
      name: editName.trim() || undefined,
      notes: editNotes.trim() || undefined,
      updatedAt: nowIso(),
    })

    setEditSaving(false)
    cancelEdit()
  }

  async function assignHerdToEnclosure(event: React.FormEvent) {
    event.preventDefault()

    if (!selectedEnclosureId) {
      setAssignmentError('Bitte einen Pferch wählen.')
      return
    }

    if (activeAssignment) {
      setAssignmentError('Diese Herde ist bereits einem Pferch zugewiesen.')
      return
    }

    const enclosure = enclosuresById.get(selectedEnclosureId)
    if (!enclosure) {
      setAssignmentError('Gewählter Pferch wurde nicht gefunden.')
      return
    }

    const parsedCount =
      assignmentCount.trim() === '' ? null : Number.parseInt(assignmentCount.trim(), 10)

    if (parsedCount !== null && (!Number.isFinite(parsedCount) || parsedCount < 0)) {
      setAssignmentError('Tierzahl muss leer oder eine gültige Zahl sein.')
      return
    }

    setAssignmentSaving(true)
    setAssignmentError('')

    try {
      const timestamp = nowIso()

      await db.transaction('rw', db.enclosureAssignments, db.enclosures, async () => {
        await db.enclosureAssignments.add({
          id: createId('enclosure_assignment'),
          enclosureId: enclosure.id,
          herdId: id,
          count: parsedCount,
          startTime: timestamp,
          endTime: null,
          notes: assignmentNotes.trim() || undefined,
          createdAt: timestamp,
          updatedAt: timestamp,
        })

        await db.enclosures.update(enclosure.id, {
          herdId: id,
          updatedAt: timestamp,
        })
      })

      setSelectedEnclosureId('')
      setAssignmentNotes('')
    } catch (err) {
      setAssignmentError(
        err instanceof Error ? err.message : 'Zuweisung konnte nicht gespeichert werden.'
      )
    } finally {
      setAssignmentSaving(false)
    }
  }

  async function endAssignment(assignment: EnclosureAssignment) {
    setEndingAssignmentId(assignment.id)
    setAssignmentError('')

    try {
      const timestamp = nowIso()

      await db.transaction('rw', db.enclosureAssignments, db.enclosures, async () => {
        await db.enclosureAssignments.update(assignment.id, {
          endTime: timestamp,
          updatedAt: timestamp,
        })

        await db.enclosures.update(assignment.enclosureId, {
          herdId: null,
          updatedAt: timestamp,
        })
      })
    } catch (err) {
      setAssignmentError(
        err instanceof Error ? err.message : 'Ausweisung konnte nicht gespeichert werden.'
      )
    } finally {
      setEndingAssignmentId(null)
    }
  }

  async function deleteHerd() {
    const confirmed = window.confirm(
      `Herde "${safeHerd.name}" wirklich löschen? Tiere, Weidegänge, Arbeitseinsätze und Belegungen dieser Herde werden ebenfalls entfernt.`
    )

    if (!confirmed) return

    await deleteHerdCascade(safeHerd.id)
    router.push('/herds')
  }

  async function saveHerdMeta(event: React.FormEvent) {
    event.preventDefault()
    if (!metaName.trim()) return

    setMetaSaving(true)
    setMetaSaved(false)

    await db.herds.update(safeHerd.id, {
      name: metaName.trim(),
      fallbackCount: metaFallbackCount.trim() ? Number(metaFallbackCount) : null,
      notes: metaNotes.trim() || undefined,
      updatedAt: nowIso(),
    })

    setMetaSaving(false)
    setMetaSaved(true)
  }

  return (
    <div className="space-y-5 rounded-[2rem] bg-[#d8d0bf] p-1 sm:p-2">
      <form
        onSubmit={saveHerdMeta}
        className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-700">
              Herde
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-neutral-950 shadow-sm"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={() => void deleteHerd()}
              className="rounded-[1.1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 shadow-sm"
            >
              Herde löschen
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
              Name
            </label>
            <input
              className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-2xl font-semibold tracking-[-0.02em] shadow-sm"
              value={metaName}
              onChange={(event) => setMetaName(event.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
                Geschätzte Anzahl (optional)
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
                value={metaFallbackCount}
                onChange={(event) => setMetaFallbackCount(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
                Notiz
              </label>
              <input
                className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
                value={metaNotes}
                onChange={(event) => setMetaNotes(event.target.value)}
                placeholder="optionale Bemerkung"
              />
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
            <div className="text-neutral-700">Aktive Tiere</div>
            <div className="mt-1 font-semibold text-neutral-950">{activeAnimalsCount || effectiveHerdCount || 0}</div>
          </div>
          <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
            <div className="text-neutral-700">Aktiver Pferch</div>
            <div className="mt-1 font-semibold text-neutral-950">{currentEnclosure?.name ?? 'Keiner'}</div>
          </div>
          <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
            <div className="text-neutral-700">Status</div>
            <div className="mt-1 font-semibold text-neutral-950">
              {safeHerd.isArchived ? 'Archiviert' : 'Aktiv'}
            </div>
          </div>
        </div>
        {metaDirty ? (
          <div className="mt-4">
            <button
              type="submit"
              disabled={metaSaving}
              className="rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-3 text-sm font-semibold text-neutral-950 shadow-sm"
            >
              {metaSaving ? 'Speichert …' : 'Änderungen speichern'}
            </button>
          </div>
        ) : null}
        {metaSaved ? (
          <div className="mt-3 rounded-[1.1rem] border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-900">
            Herdendaten gespeichert.
          </div>
        ) : null}
      </form>

      <section className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em]">1. Pferch-Belegung</h2>
            <p className="mt-2 text-sm text-neutral-700">
              Aktuellen Pferch der Herde sehen und direkte Wechsel erfassen.
            </p>
          </div>

          <Link
            href="/enclosures"
            className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-neutral-950 shadow-sm"
          >
            Zu Pferchen
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-[1.15rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
            <div className="text-neutral-700">Aktiver Pferch</div>
            <div className="mt-1 font-medium text-neutral-900">
              {currentEnclosure?.name ?? 'Keiner'}
            </div>
          </div>
          <div className="rounded-[1.15rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
            <div className="text-neutral-700">Aktueller Besatz</div>
            <div className="mt-1 font-medium text-neutral-900">
              {activeAssignment?.count ?? effectiveHerdCount ?? 'unbekannt'}
            </div>
          </div>
          <div className="rounded-[1.15rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
            <div className="text-neutral-700">Seit</div>
            <div className="mt-1 font-medium text-neutral-900">
              {activeAssignment?.startTime ? formatDateTime(activeAssignment.startTime) : 'Nicht zugewiesen'}
            </div>
          </div>
        </div>

        {activeAssignment && currentEnclosure ? (
          <div className="mt-4 rounded-[1.25rem] border border-[#d2cbc0] bg-[#efe4c8] px-4 py-4 text-sm text-[#17130f]">
            <div className="font-medium">{currentEnclosure.name}</div>
            <div className="mt-1">
              Verweildauer {formatDurationFromIso(activeAssignment.startTime)}
            </div>
            {activeAssignment.notes ? <div className="mt-1">{activeAssignment.notes}</div> : null}
            <button
              type="button"
              onClick={() => void endAssignment(activeAssignment)}
              disabled={endingAssignmentId === activeAssignment.id}
              className="mt-3 rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 font-semibold text-neutral-950 shadow-sm disabled:opacity-50"
            >
              {endingAssignmentId === activeAssignment.id ? 'Weist aus ...' : 'Aus aktuellem Pferch ausweisen'}
            </button>
          </div>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={assignHerdToEnclosure}>
            <div>
              <label className="mb-1 block text-sm font-medium">Pferch wählen</label>
              <select
                className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
                value={selectedEnclosureId}
                onChange={(e) => setSelectedEnclosureId(e.target.value)}
              >
                <option value="">Bitte wählen</option>
                {availableEnclosures.map((enclosure) => (
                  <option key={enclosure.id} value={enclosure.id}>
                    {enclosure.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Tierzahl</label>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
                  value={assignmentCount}
                  onChange={(e) => setAssignmentCount(e.target.value)}
                  placeholder="automatisch aus Herde"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Notiz</label>
                <input
                  className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  placeholder="optionale Bemerkung"
                />
              </div>
            </div>

            {assignmentError ? (
              <div className="rounded-[1.1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                {assignmentError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={assignmentSaving || !selectedEnclosureId}
              className="rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-4 font-semibold text-neutral-950 shadow-[0_12px_24px_rgba(40,34,26,0.08)] disabled:opacity-50"
            >
              {assignmentSaving ? 'Speichert ...' : 'In Pferch einweisen'}
            </button>
          </form>
        )}

        <div className="mt-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-700">Letzte Aufenthalte</h3>
          {recentAssignments.length === 0 ? (
            <div className="mt-2 rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm text-neutral-700 shadow-sm">
              Noch keine Pferchwechsel für diese Herde vorhanden.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {recentAssignments.map((assignment) => {
                const enclosure = enclosuresById.get(assignment.enclosureId)

                return (
                  <div key={assignment.id} className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm shadow-sm">
                    <div className="font-medium text-neutral-900">
                      {enclosure?.name ?? 'Unbekannter Pferch'}
                    </div>
                    <div className="mt-1 text-neutral-700">
                      {formatDateTime(assignment.startTime)}
                      {assignment.endTime
                        ? ` bis ${formatDateTime(assignment.endTime)}`
                        : ' bis jetzt'}
                    </div>
                    <div className="mt-1 text-neutral-700">
                      Dauer {formatDurationFromIso(assignment.startTime, assignment.endTime)}
                      {' '}· Besatz {assignment.count ?? effectiveHerdCount ?? 'unbekannt'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em]">2. Tier hinzufügen</h2>
            <p className="mt-2 text-sm text-neutral-700">
              Neues Tier wird direkt dieser Herde zugeordnet.
            </p>
          </div>
          <div className="rounded-full border border-[#ccb98a] bg-[#fffdf6] px-3 py-1.5 text-sm font-semibold text-neutral-950">
            Herde: {safeHerd.name}
          </div>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleAddAnimal}>
          <EarTagScanPanel
            disabled={saving}
            value={earTag}
            onApplyValue={setEarTag}
          />

          <div>
            <label className="mb-1 block text-sm font-medium">Ohrmarke</label>
            <input
              className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
              value={earTag}
              onChange={(e) => setEarTag(e.target.value)}
              placeholder="z. B. IT021000123456"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Tierart</label>
            <select
              className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
              value={species}
              onChange={(e) => setSpecies(e.target.value as Species)}
            >
              {speciesOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Name (optional)</label>
            <input
              className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="optional"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Notiz</label>
            <textarea
              className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Bemerkungen zum Tier"
            />
          </div>

          {error ? (
            <div className="rounded-[1.1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-4 font-semibold text-neutral-950 shadow-[0_12px_24px_rgba(40,34,26,0.08)] disabled:opacity-50"
          >
            {saving ? 'Speichert …' : 'Tier speichern'}
          </button>
        </form>
      </section>

      <section className="rounded-[1.5rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">3. Tiere in {safeHerd.name}</h2>
            <p className="mt-1 text-sm text-neutral-700">
              Alle angezeigten Tiere gehören zu dieser Herde.
            </p>
          </div>

          <button
            onClick={() => setShowArchived((prev) => !prev)}
            className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-neutral-950 shadow-sm"
          >
            {showArchived ? 'Nur aktive anzeigen' : 'Archivierte anzeigen'}
          </button>
        </div>
      </section>

      {editingAnimalId ? (
        <section className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
          <h2 className="text-lg font-semibold tracking-[-0.02em]">Tier bearbeiten</h2>

          <form className="mt-4 space-y-4" onSubmit={saveEdit}>
            <EarTagScanPanel
              disabled={editSaving}
              value={editEarTag}
              onApplyValue={setEditEarTag}
            />

            <div>
              <label className="mb-1 block text-sm font-medium">Ohrmarke</label>
              <input
                className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
                value={editEarTag}
                onChange={(e) => setEditEarTag(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Tierart</label>
              <select
                className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
                value={editSpecies}
                onChange={(e) => setEditSpecies(e.target.value as Species)}
              >
                {speciesOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Name (optional)</label>
              <input
                className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Notiz</label>
              <textarea
                className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>

            {editError ? (
              <div className="rounded-[1.1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                {editError}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={editSaving}
                className="rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-3 font-semibold text-neutral-950 shadow-[0_12px_24px_rgba(40,34,26,0.08)] disabled:opacity-50"
              >
                {editSaving ? 'Speichert …' : 'Änderungen speichern'}
              </button>

              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 font-semibold text-neutral-950 shadow-sm"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="space-y-3">
        {visibleAnimals.length === 0 ? (
          <div className="rounded-[1.75rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 text-neutral-700 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
            Keine passenden Tiere in dieser Ansicht vorhanden.
          </div>
        ) : (
          grouped.map((group) =>
            group.animals.length > 0 ? (
              <div key={group.value} className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-700">
                  {group.label} ({group.animals.length})
                </h3>

                {group.animals.map((animal) => (
                  <article
                    key={animal.id}
                    className="rounded-[1.75rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-semibold">{animal.earTag}</h4>
                        {animal.name ? (
                          <p className="text-sm text-neutral-700">{animal.name}</p>
                        ) : null}
                        {animal.notes ? (
                          <p className="mt-2 text-sm text-neutral-700">{animal.notes}</p>
                        ) : null}
                        <p className="mt-2 text-xs font-medium text-neutral-700">
                          Status: {animal.isArchived ? 'archiviert' : 'aktiv'}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(animal)}
                          className="rounded-[1rem] border border-[#ccb98a] bg-[#fffdf6] px-3 py-2 text-sm font-semibold text-neutral-950 shadow-sm"
                        >
                          Bearbeiten
                        </button>

                        <button
                          type="button"
                          onClick={() => setAnimalArchived(animal.id, !animal.isArchived)}
                          className="rounded-[1rem] border border-[#ccb98a] bg-[#fffdf6] px-3 py-2 text-sm font-semibold text-neutral-950 shadow-sm"
                        >
                          {animal.isArchived ? 'Reaktivieren' : 'Archivieren'}
                        </button>

                        <button
                          type="button"
                          onClick={() => void deleteAnimal(animal)}
                          className="rounded-[1rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 shadow-sm"
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null
          )
        )}
      </section>
    </div>
  )
}
