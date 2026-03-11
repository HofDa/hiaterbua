import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { saveDrawnEnclosureRecord } from '@/lib/maps/live-position-actions'
import {
  getDraftPolygon,
  type DraftPoint,
} from '@/lib/maps/live-position-map-helpers'
import type { Enclosure } from '@/types/domain'

type UseLivePositionMapDrawControllerOptions = {
  positionAccuracy: number | null
  draftAreaM2: number
  draftPoints: DraftPoint[]
  name: string
  notes: string
  setDraftPoints: Dispatch<SetStateAction<DraftPoint[]>>
  setIsDrawing: Dispatch<SetStateAction<boolean>>
  setName: Dispatch<SetStateAction<string>>
  setNotes: Dispatch<SetStateAction<string>>
  setSaveError: Dispatch<SetStateAction<string>>
  setIsSaving: Dispatch<SetStateAction<boolean>>
  setSelectedEnclosureId: Dispatch<SetStateAction<string | null>>
  setShowSelectedTrack: Dispatch<SetStateAction<boolean>>
  setIsSelectedEnclosureInfoOpen: Dispatch<SetStateAction<boolean>>
  setEditingEnclosureId: Dispatch<SetStateAction<string | null>>
  setAssignmentEditorEnclosureId: Dispatch<SetStateAction<string | null>>
  focusEnclosure: (enclosure: Enclosure) => void
}

export function useLivePositionMapDrawController({
  positionAccuracy,
  draftAreaM2,
  draftPoints,
  name,
  notes,
  setDraftPoints,
  setIsDrawing,
  setName,
  setNotes,
  setSaveError,
  setIsSaving,
  setSelectedEnclosureId,
  setShowSelectedTrack,
  setIsSelectedEnclosureInfoOpen,
  setEditingEnclosureId,
  setAssignmentEditorEnclosureId,
  focusEnclosure,
}: UseLivePositionMapDrawControllerOptions) {
  function startDrawing() {
    setSelectedEnclosureId(null)
    setShowSelectedTrack(false)
    setIsSelectedEnclosureInfoOpen(false)
    setEditingEnclosureId(null)
    setAssignmentEditorEnclosureId(null)
    setIsDrawing(true)
    setSaveError('')
  }

  function finishDrawing() {
    if (draftPoints.length < 3) {
      setSaveError('Mindestens drei Punkte sind für einen Pferch nötig.')
      return
    }

    setIsDrawing(false)
    setSaveError('')
  }

  function clearDraft() {
    setDraftPoints([])
    setIsDrawing(false)
    setSaveError('')
  }

  function undoLastPoint() {
    setDraftPoints((currentPoints) => currentPoints.slice(0, -1))
    setSaveError('')
  }

  async function saveEnclosure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const cleanedName = name.trim()
    if (!cleanedName) {
      setSaveError('Bitte einen Namen für den Pferch vergeben.')
      return
    }

    const draftPolygon = getDraftPolygon(draftPoints)
    if (!draftPolygon) {
      setSaveError('Es fehlt noch ein gültiges Polygon.')
      return
    }

    setIsSaving(true)
    setSaveError('')

    try {
      const enclosure = await saveDrawnEnclosureRecord({
        name: cleanedName,
        notes,
        geometry: draftPolygon.geometry,
        areaM2: draftAreaM2,
        points: draftPoints,
        accuracyM: positionAccuracy,
      })

      setSelectedEnclosureId(enclosure.id)
      setShowSelectedTrack(false)
      setIsSelectedEnclosureInfoOpen(true)
      setEditingEnclosureId(null)
      setAssignmentEditorEnclosureId(null)
      focusEnclosure(enclosure)
      setName('')
      setNotes('')
      setDraftPoints([])
      setIsDrawing(false)
    } catch {
      setSaveError('Pferch konnte nicht gespeichert werden.')
    } finally {
      setIsSaving(false)
    }
  }

  return {
    startDrawing,
    finishDrawing,
    clearDraft,
    undoLastPoint,
    saveEnclosure,
  }
}
