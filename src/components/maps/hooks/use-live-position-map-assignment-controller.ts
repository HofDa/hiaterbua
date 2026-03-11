import type { Dispatch, SetStateAction } from 'react'
import {
  assignHerdToEnclosureRecord,
  endEnclosureAssignmentRecord,
  getDefaultAssignmentValues,
} from '@/lib/maps/live-position-actions'
import { getEffectiveHerdCount } from '@/lib/maps/live-position-map-helpers'
import type {
  Animal,
  Enclosure,
  EnclosureAssignment,
  Herd,
} from '@/types/domain'

type UseLivePositionMapAssignmentControllerOptions = {
  safeHerds: Herd[]
  herdsById: Map<string, Herd>
  animalsByHerdId: Map<string, Animal[]>
  activeAssignmentsByEnclosureId: Map<string, EnclosureAssignment>
  assignmentHerdId: string
  assignmentCount: string
  assignmentNotes: string
  setSelectedEnclosureId: Dispatch<SetStateAction<string | null>>
  setAssignmentEditorEnclosureId: Dispatch<SetStateAction<string | null>>
  setAssignmentHerdId: Dispatch<SetStateAction<string>>
  setAssignmentCount: Dispatch<SetStateAction<string>>
  setAssignmentNotes: Dispatch<SetStateAction<string>>
  setAssignmentError: Dispatch<SetStateAction<string>>
  setIsAssignmentSaving: Dispatch<SetStateAction<boolean>>
  setEndingAssignmentId: Dispatch<SetStateAction<string | null>>
}

export function useLivePositionMapAssignmentController({
  safeHerds,
  herdsById,
  animalsByHerdId,
  activeAssignmentsByEnclosureId,
  assignmentHerdId,
  assignmentCount,
  assignmentNotes,
  setSelectedEnclosureId,
  setAssignmentEditorEnclosureId,
  setAssignmentHerdId,
  setAssignmentCount,
  setAssignmentNotes,
  setAssignmentError,
  setIsAssignmentSaving,
  setEndingAssignmentId,
}: UseLivePositionMapAssignmentControllerOptions) {
  function resetAssignmentState() {
    setAssignmentEditorEnclosureId(null)
    setAssignmentHerdId('')
    setAssignmentCount('')
    setAssignmentNotes('')
    setAssignmentError('')
  }

  function openAssignmentEditor(enclosure: Enclosure) {
    setAssignmentEditorEnclosureId(enclosure.id)
    setAssignmentError('')
    const defaults = getDefaultAssignmentValues({
      herds: safeHerds,
      animalsByHerdId,
      getEffectiveHerdCount,
    })

    setAssignmentHerdId(defaults.herdId)
    setAssignmentCount(defaults.count)
    setAssignmentNotes('')
  }

  function cancelAssignmentEditor() {
    resetAssignmentState()
  }

  function handleAssignmentHerdIdChange(nextHerdId: string) {
    const nextHerd = herdsById.get(nextHerdId)
    const effectiveCount = nextHerd
      ? getEffectiveHerdCount(nextHerd, animalsByHerdId.get(nextHerdId) ?? [])
      : null

    setAssignmentHerdId(nextHerdId)
    setAssignmentCount(effectiveCount !== null ? String(effectiveCount) : '')
  }

  async function assignHerdToEnclosure(enclosure: Enclosure) {
    const activeAssignment = activeAssignmentsByEnclosureId.get(enclosure.id)
    if (activeAssignment) {
      setAssignmentError('Dieser Pferch ist bereits aktiv belegt.')
      return
    }

    const herd = herdsById.get(assignmentHerdId)
    if (!herd) {
      setAssignmentError('Bitte eine Herde für die Zuweisung wählen.')
      return
    }

    const parsedCount =
      assignmentCount.trim() === '' ? null : Number.parseInt(assignmentCount.trim(), 10)

    if (parsedCount !== null && (!Number.isFinite(parsedCount) || parsedCount < 0)) {
      setAssignmentError('Tierzahl muss leer oder eine gültige Zahl sein.')
      return
    }

    setIsAssignmentSaving(true)
    setAssignmentError('')

    try {
      await assignHerdToEnclosureRecord({
        enclosure,
        herd,
        count: parsedCount,
        notes: assignmentNotes,
      })

      resetAssignmentState()
      setSelectedEnclosureId(enclosure.id)
    } catch (error) {
      setAssignmentError(
        error instanceof Error ? error.message : 'Zuweisung konnte nicht gespeichert werden.'
      )
    } finally {
      setIsAssignmentSaving(false)
    }
  }

  async function endEnclosureAssignment(assignment: EnclosureAssignment) {
    setEndingAssignmentId(assignment.id)
    setAssignmentError('')

    try {
      await endEnclosureAssignmentRecord(assignment)
    } catch (error) {
      setAssignmentError(
        error instanceof Error ? error.message : 'Ausweisung konnte nicht gespeichert werden.'
      )
    } finally {
      setEndingAssignmentId(null)
    }
  }

  return {
    openAssignmentEditor,
    cancelAssignmentEditor,
    handleAssignmentHerdIdChange,
    assignHerdToEnclosure,
    endEnclosureAssignment,
  }
}
