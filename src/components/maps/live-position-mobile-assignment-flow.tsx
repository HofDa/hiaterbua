'use client'

import { useState, type ChangeEvent } from 'react'
import { ErrorAlert } from '@/components/ui/alert'
import { FormField, FormLabel, FormTextarea } from '@/components/ui/form'
import {
  FlowCountCard,
  FlowEmptyState,
  FlowOptionGrid,
  FlowPrimaryAction,
  FlowSecondaryAction,
  FlowSelectableTile,
  FlowStepperButton,
  FlowStepHeader,
} from '@/components/ui/mobile-flow'
import { getAssignableHerds } from '@/lib/maps/live-position-map-helpers'
import type { Enclosure, EnclosureAssignment, Herd } from '@/types/domain'

type LivePositionMobileAssignmentFlowProps = {
  enclosure: Enclosure
  assignmentHerdId: string
  assignmentCount: string
  assignmentNotes: string
  assignmentError: string
  isAssignmentSaving: boolean
  safeHerds: Herd[]
  activeAssignmentsByHerdId: Map<string, EnclosureAssignment>
  onCancelAssignmentEditor: () => void
  onAssignHerdToEnclosure: (enclosure: Enclosure) => void
  onAssignmentHerdIdChange: (nextHerdId: string) => void
  onAssignmentCountChange: (value: string) => void
  onAssignmentNotesChange: (value: string) => void
}

export function LivePositionMobileAssignmentFlow({
  enclosure,
  assignmentHerdId,
  assignmentCount,
  assignmentNotes,
  assignmentError,
  isAssignmentSaving,
  safeHerds,
  activeAssignmentsByHerdId,
  onCancelAssignmentEditor,
  onAssignHerdToEnclosure,
  onAssignmentHerdIdChange,
  onAssignmentCountChange,
  onAssignmentNotesChange,
}: LivePositionMobileAssignmentFlowProps) {
  const [isNotesOpen, setIsNotesOpen] = useState(false)
  const assignableHerds = getAssignableHerds(safeHerds, activeAssignmentsByHerdId, enclosure.id)
  const parsedCount = Number.parseInt(assignmentCount.trim(), 10)
  const animalCount = Number.isFinite(parsedCount) ? parsedCount : 0
  const hasSelectedAssignmentHerd = assignableHerds.some((herd) => herd.id === assignmentHerdId)

  return (
    <div className="rounded-2xl border border-border bg-surface-raised px-4 py-4 shadow-sm">
      <FlowStepHeader
        label={enclosure.name}
        sublabel="Herde zuweisen"
        onBack={onCancelAssignmentEditor}
        backLabel="Abbrechen"
      />

      {assignableHerds.length === 0 ? (
        <div className="mt-3">
          <FlowEmptyState className="rounded-[1.25rem]">
            Alle aktiven Herden sind bereits anderen Pferchen zugewiesen.
          </FlowEmptyState>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <FlowOptionGrid>
            {assignableHerds.map((herd) => (
              <FlowSelectableTile
                key={herd.id}
                onClick={() => onAssignmentHerdIdChange(herd.id)}
                pressed={assignmentHerdId === herd.id}
              >
                {herd.name}
              </FlowSelectableTile>
            ))}
          </FlowOptionGrid>

          <div className="grid grid-cols-2 gap-3">
            <FlowCountCard label="Tiere" value={animalCount} />

            <FlowStepperButton
              onClick={() => onAssignmentCountChange(String(Math.max(0, animalCount - 1)))}
              disabled={animalCount <= 0}
            >
              -
            </FlowStepperButton>
            <FlowStepperButton onClick={() => onAssignmentCountChange(String(animalCount + 1))}>
              +
            </FlowStepperButton>
          </div>

          <FlowPrimaryAction
            onClick={() => onAssignHerdToEnclosure(enclosure)}
            disabled={isAssignmentSaving || !hasSelectedAssignmentHerd}
          >
            {isAssignmentSaving ? 'Speichert ...' : 'Herde zuweisen'}
          </FlowPrimaryAction>

          <FlowSecondaryAction
            onClick={() => setIsNotesOpen((current) => !current)}
            aria-expanded={isNotesOpen}
          >
            {isNotesOpen ? 'Notiz ausblenden' : 'Notiz hinzufügen'}
          </FlowSecondaryAction>

          {isNotesOpen ? (
            <FormField>
              <FormLabel>Notiz</FormLabel>
              <FormTextarea
                rows={3}
                value={assignmentNotes}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  onAssignmentNotesChange(event.target.value)
                }
                placeholder="optionale Bemerkung zur Belegung"
              />
            </FormField>
          ) : null}
        </div>
      )}

      {assignmentError ? <ErrorAlert className="mt-3">{assignmentError}</ErrorAlert> : null}
    </div>
  )
}
