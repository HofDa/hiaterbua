'use client'

import { useEffect, useState } from 'react'
import {
  assignHerdToEnclosureRecord,
  endEnclosureAssignmentRecord,
} from '@/lib/maps/live-position-actions'
import type { Enclosure, EnclosureAssignment } from '@/types/domain'

type UseHerdDetailAssignmentControllerOptions = {
  herdId: string
  effectiveHerdCount: number | null
  activeAssignment: EnclosureAssignment | null
  enclosuresById: Map<string, Enclosure>
}

export function useHerdDetailAssignmentController({
  herdId,
  effectiveHerdCount,
  activeAssignment,
  enclosuresById,
}: UseHerdDetailAssignmentControllerOptions) {
  const [selectedEnclosureId, setSelectedEnclosureId] = useState('')
  const [assignmentCount, setAssignmentCount] = useState('')
  const [assignmentNotes, setAssignmentNotes] = useState('')
  const [assignmentSaving, setAssignmentSaving] = useState(false)
  const [assignmentError, setAssignmentError] = useState('')
  const [endingAssignmentId, setEndingAssignmentId] = useState<string | null>(null)

  useEffect(() => {
    if (effectiveHerdCount === null || effectiveHerdCount === undefined) {
      setAssignmentCount('')
      return
    }

    setAssignmentCount(String(effectiveHerdCount))
  }, [effectiveHerdCount])

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
      await assignHerdToEnclosureRecord({
        enclosure,
        herdId,
        count: parsedCount,
        notes: assignmentNotes,
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
      await endEnclosureAssignmentRecord(assignment)
    } catch (err) {
      setAssignmentError(
        err instanceof Error ? err.message : 'Ausweisung konnte nicht gespeichert werden.'
      )
    } finally {
      setEndingAssignmentId(null)
    }
  }

  return {
    selectedEnclosureId,
    assignmentCount,
    assignmentNotes,
    assignmentSaving,
    assignmentError,
    endingAssignmentId,
    setSelectedEnclosureId,
    setAssignmentCount,
    setAssignmentNotes,
    assignHerdToEnclosure,
    endAssignment,
  }
}
