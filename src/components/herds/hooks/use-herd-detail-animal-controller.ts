'use client'

import { useState } from 'react'
import { db } from '@/lib/db/dexie'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type { Animal, Species } from '@/types/domain'

type UseHerdDetailAnimalControllerOptions = {
  herdId: string
}

function getAnimalActionError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function useHerdDetailAnimalController({
  herdId,
}: UseHerdDetailAnimalControllerOptions) {
  const [earTag, setEarTag] = useState('')
  const [species, setSpecies] = useState<Species>('sheep')
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [editingAnimalId, setEditingAnimalId] = useState<string | null>(null)
  const [editEarTag, setEditEarTag] = useState('')
  const [editSpecies, setEditSpecies] = useState<Species>('sheep')
  const [editName, setEditName] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  async function handleAddAnimal(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    const cleanedEarTag = earTag.trim()

    if (!cleanedEarTag) {
      setError('Bitte eine Ohrmarke eingeben.')
      return
    }

    setSaving(true)

    try {
      const existing = await db.animals
        .where('earTag')
        .equalsIgnoreCase(cleanedEarTag)
        .first()

      if (existing) {
        setError('Diese Ohrmarke existiert bereits.')
        return
      }

      const timestamp = nowIso()
      const animal: Animal = {
        id: createId('animal'),
        herdId,
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
    } catch (currentError) {
      setError(getAnimalActionError(currentError, 'Tier konnte nicht gespeichert werden.'))
    } finally {
      setSaving(false)
    }
  }

  async function setAnimalArchived(animalId: string, isArchived: boolean) {
    setError('')

    try {
      const updatedCount = await db.animals.update(animalId, {
        isArchived,
        updatedAt: nowIso(),
      })

      if (updatedCount === 0) {
        throw new Error('Tier wurde nicht gefunden.')
      }
    } catch (currentError) {
      setError(getAnimalActionError(currentError, 'Tierstatus konnte nicht gespeichert werden.'))
    }
  }

  async function deleteAnimal(animal: Animal) {
    const confirmed = window.confirm(
      `Tier "${animal.earTag}" wirklich aus der Herde löschen?`
    )

    if (!confirmed) return

    setError('')

    try {
      await db.animals.delete(animal.id)
    } catch (currentError) {
      setError(getAnimalActionError(currentError, 'Tier konnte nicht gelöscht werden.'))
    }
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

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault()
    if (!editingAnimalId) return

    const cleanedEarTag = editEarTag.trim()

    if (!cleanedEarTag) {
      setEditError('Bitte eine Ohrmarke eingeben.')
      return
    }

    setEditSaving(true)

    try {
      const existing = await db.animals
        .where('earTag')
        .equalsIgnoreCase(cleanedEarTag)
        .first()

      if (existing && existing.id !== editingAnimalId) {
        setEditError('Diese Ohrmarke existiert bereits.')
        return
      }

      const updatedCount = await db.animals.update(editingAnimalId, {
        earTag: cleanedEarTag,
        species: editSpecies,
        name: editName.trim() || undefined,
        notes: editNotes.trim() || undefined,
        updatedAt: nowIso(),
      })

      if (updatedCount === 0) {
        throw new Error('Tier wurde nicht gefunden.')
      }

      cancelEdit()
    } catch (currentError) {
      setEditError(getAnimalActionError(currentError, 'Tier konnte nicht gespeichert werden.'))
    } finally {
      setEditSaving(false)
    }
  }

  return {
    earTag,
    species,
    name,
    notes,
    saving,
    error,
    showArchived,
    editingAnimalId,
    editEarTag,
    editSpecies,
    editName,
    editNotes,
    editError,
    editSaving,
    setEarTag,
    setSpecies,
    setName,
    setNotes,
    setShowArchived,
    setEditEarTag,
    setEditSpecies,
    setEditName,
    setEditNotes,
    handleAddAnimal,
    setAnimalArchived,
    deleteAnimal,
    startEdit,
    cancelEdit,
    saveEdit,
  }
}
