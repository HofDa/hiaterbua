import type { Dispatch, FormEvent, SetStateAction } from 'react'
import {
  deleteEnclosureRecord,
  updateEditedEnclosureRecord,
} from '@/lib/maps/live-position-actions'
import {
  getDraftPolygon,
  type DraftPoint,
} from '@/lib/maps/live-position-map-helpers'
import type { Enclosure } from '@/types/domain'

type UseLivePositionMapEditControllerOptions = {
  safeEnclosures: Enclosure[]
  editAreaM2: number
  selectedEnclosureId: string | null
  editingEnclosureId: string | null
  editName: string
  editNotes: string
  editGeometryPoints: DraftPoint[]
  selectedEditPointIndex: number | null
  setSelectedEnclosureId: Dispatch<SetStateAction<string | null>>
  setShowSelectedTrack: Dispatch<SetStateAction<boolean>>
  setEditingEnclosureId: Dispatch<SetStateAction<string | null>>
  setEditName: Dispatch<SetStateAction<string>>
  setEditNotes: Dispatch<SetStateAction<string>>
  setEditError: Dispatch<SetStateAction<string>>
  setIsEditing: Dispatch<SetStateAction<boolean>>
  setEditGeometryPoints: Dispatch<SetStateAction<DraftPoint[]>>
  setSelectedEditPointIndex: Dispatch<SetStateAction<number | null>>
  setIsAddingEditPoint: Dispatch<SetStateAction<boolean>>
}

export function useLivePositionMapEditController({
  safeEnclosures,
  editAreaM2,
  selectedEnclosureId,
  editingEnclosureId,
  editName,
  editNotes,
  editGeometryPoints,
  selectedEditPointIndex,
  setSelectedEnclosureId,
  setShowSelectedTrack,
  setEditingEnclosureId,
  setEditName,
  setEditNotes,
  setEditError,
  setIsEditing,
  setEditGeometryPoints,
  setSelectedEditPointIndex,
  setIsAddingEditPoint,
}: UseLivePositionMapEditControllerOptions) {
  function resetEditState() {
    setEditingEnclosureId(null)
    setEditName('')
    setEditNotes('')
    setEditError('')
    setEditGeometryPoints([])
    setSelectedEditPointIndex(null)
    setIsAddingEditPoint(false)
  }

  function startEditEnclosure(enclosure: Enclosure) {
    setSelectedEnclosureId(enclosure.id)
    setShowSelectedTrack(false)
    setEditingEnclosureId(enclosure.id)
    setEditName(enclosure.name)
    setEditNotes(enclosure.notes ?? '')
    setEditError('')
    setSelectedEditPointIndex(null)
    setIsAddingEditPoint(false)
    setEditGeometryPoints(
      enclosure.geometry
        ? enclosure.geometry.coordinates[0]
            .slice(0, -1)
            .map(([lon, lat]) => ({ lon, lat }))
        : []
    )
  }

  function cancelEditEnclosure() {
    resetEditState()
  }

  function startAddEditPoint() {
    setIsAddingEditPoint(true)
    setSelectedEditPointIndex(null)
    setEditError('')
  }

  function removeSelectedEditPoint() {
    if (selectedEditPointIndex === null) return

    if (editGeometryPoints.length <= 3) {
      setEditError('Ein Pferch braucht mindestens drei Punkte.')
      return
    }

    setEditGeometryPoints((currentPoints) =>
      currentPoints.filter((_, index) => index !== selectedEditPointIndex)
    )
    setSelectedEditPointIndex(null)
    setIsAddingEditPoint(false)
    setEditError('')
  }

  async function persistEditedEnclosure() {
    if (!editingEnclosureId) return false

    const currentEnclosure =
      safeEnclosures.find((enclosure) => enclosure.id === editingEnclosureId) ?? null
    if (!currentEnclosure) {
      setEditError('Pferch konnte nicht gefunden werden.')
      return false
    }

    const cleanedName = editName.trim()
    if (!cleanedName) {
      setEditError('Bitte einen Namen für den Pferch vergeben.')
      return false
    }

    const editPolygon = getDraftPolygon(editGeometryPoints)
    if (!editPolygon) {
      setEditError('Mindestens drei Punkte sind für den Pferch nötig.')
      return false
    }

    setIsEditing(true)
    setEditError('')

    try {
      await updateEditedEnclosureRecord({
        enclosureId: editingEnclosureId,
        name: cleanedName,
        notes: editNotes,
        geometry: editPolygon.geometry,
        areaM2: editAreaM2,
        pointsCount: editGeometryPoints.length,
      })

      setEditingEnclosureId(null)
      setSelectedEnclosureId(editingEnclosureId)
      return true
    } catch {
      setEditError('Pferch konnte nicht aktualisiert werden.')
      return false
    } finally {
      setIsEditing(false)
    }
  }

  async function saveEditedEnclosure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await persistEditedEnclosure()
  }

  async function deleteEnclosure(enclosure: Enclosure) {
    const confirmed = window.confirm(
      `Pferch "${enclosure.name}" wirklich lokal löschen?`
    )

    if (!confirmed) return

    await deleteEnclosureRecord(enclosure.id)

    if (selectedEnclosureId === enclosure.id) {
      setSelectedEnclosureId(null)
    }

    if (editingEnclosureId === enclosure.id) {
      resetEditState()
    }
  }

  return {
    startEditEnclosure,
    cancelEditEnclosure,
    startAddEditPoint,
    removeSelectedEditPoint,
    persistEditedEnclosure,
    saveEditedEnclosure,
    deleteEnclosure,
  }
}
