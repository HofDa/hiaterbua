'use client'

import { useState } from 'react'
import { db } from '@/lib/db/dexie'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type { Animal, Species } from '@/types/domain'

type UseHerdDetailAnimalControllerOptions = {
  herdId: string
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

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault()
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
