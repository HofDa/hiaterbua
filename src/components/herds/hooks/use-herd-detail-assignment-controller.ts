'use client'

import { useEffect, useState } from 'react'
import { db } from '@/lib/db/dexie'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
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
      const timestamp = nowIso()

      await db.transaction('rw', db.enclosureAssignments, db.enclosures, async () => {
        await db.enclosureAssignments.add({
          id: createId('enclosure_assignment'),
          enclosureId: enclosure.id,
          herdId,
          count: parsedCount,
          startTime: timestamp,
          endTime: null,
          notes: assignmentNotes.trim() || undefined,
          createdAt: timestamp,
          updatedAt: timestamp,
        })

        await db.enclosures.update(enclosure.id, {
          herdId,
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
