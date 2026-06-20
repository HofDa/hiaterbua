'use client'

import { useState } from 'react'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { assertUpdated } from '@/lib/db/assert-updated'
import {
  createAnimalRecord,
  deleteAnimalRecord,
  findAnimalByEarTag,
  updateAnimalRecord,
} from '@/lib/db/repositories/animals'
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
  const confirm = useConfirm()
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
      const existing = await findAnimalByEarTag(cleanedEarTag)

      if (existing) {
        setError('Diese Ohrmarke existiert bereits.')
        return
      }

      await createAnimalRecord({
        herdId,
        earTag: cleanedEarTag,
        species,
        name,
        notes,
      })

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
      const updatedCount = await updateAnimalRecord(animalId, {
        isArchived,
      })

      assertUpdated(updatedCount, 'Tier wurde nicht gefunden.')
    } catch (currentError) {
      setError(getAnimalActionError(currentError, 'Tierstatus konnte nicht gespeichert werden.'))
    }
  }

  async function deleteAnimal(animal: Animal) {
    const confirmed = await confirm({
      title: `Tier "${animal.earTag}" löschen?`,
      description: 'Das Tier wird aus der Herde entfernt.',
      confirmLabel: 'Löschen',
      destructive: true,
    })

    if (!confirmed) return

    setError('')

    try {
      await deleteAnimalRecord(animal.id)
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
      const existing = await findAnimalByEarTag(cleanedEarTag)

      if (existing && existing.id !== editingAnimalId) {
        setEditError('Diese Ohrmarke existiert bereits.')
        return
      }

      const updatedCount = await updateAnimalRecord(editingAnimalId, {
        earTag: cleanedEarTag,
        species: editSpecies,
        name: editName.trim() || undefined,
        notes: editNotes.trim() || undefined,
      })

      assertUpdated(updatedCount, 'Tier wurde nicht gefunden.')

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
