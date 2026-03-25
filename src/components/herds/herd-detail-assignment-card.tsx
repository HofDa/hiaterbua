'use client'

import Link from 'next/link'
import {
  formatDateTime,
  formatDurationFromIso,
} from '@/lib/herds/herd-detail-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { FormField, FormLabel, FormInput, FormTextarea, FormButton } from '@/components/ui/form'
import { Alert, ErrorAlert } from '@/components/ui/alert'
import type { Enclosure, EnclosureAssignment } from '@/types/domain'

type HerdDetailAssignmentCardProps = {
  currentEnclosureName: string | null
  activeAssignment: EnclosureAssignment | null
  effectiveHerdCount: number | null
  endingAssignmentId: string | null
  selectedEnclosureId: string
  availableEnclosures: Enclosure[]
  assignmentCount: string
  assignmentNotes: string
  assignmentError: string
  assignmentSaving: boolean
  recentAssignments: EnclosureAssignment[]
  enclosuresById: Map<string, Enclosure>
  onSelectedEnclosureIdChange: (value: string) => void
  onAssignmentCountChange: (value: string) => void
  onAssignmentNotesChange: (value: string) => void
  onSubmit: (event: React.FormEvent) => void | Promise<void>
  onEndAssignment: (assignment: EnclosureAssignment) => void | Promise<void>
}

export function HerdDetailAssignmentCard({
  currentEnclosureName,
  activeAssignment,
  effectiveHerdCount,
  endingAssignmentId,
  selectedEnclosureId,
  availableEnclosures,
  assignmentCount,
  assignmentNotes,
  assignmentError,
  assignmentSaving,
  recentAssignments,
  enclosuresById,
  onSelectedEnclosureIdChange,
  onAssignmentCountChange,
  onAssignmentNotesChange,
  onSubmit,
  onEndAssignment,
}: HerdDetailAssignmentCardProps) {
  return (
    <Card>
      <CardContent>
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

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <Card className="px-4 py-3 shadow-sm">
          <div className="text-neutral-700">Aktiver Pferch</div>
          <div className="mt-1 font-medium text-neutral-900">
            {currentEnclosureName ?? 'Keiner'}
          </div>
        </Card>
        <Card className="px-4 py-3 shadow-sm">
          <div className="text-neutral-700">Aktueller Besatz</div>
          <div className="mt-1 font-medium text-neutral-900">
            {activeAssignment?.count ?? effectiveHerdCount ?? 'unbekannt'}
          </div>
        </Card>
        <Card className="px-4 py-3 shadow-sm">
          <div className="text-neutral-700">Seit</div>
          <div className="mt-1 font-medium text-neutral-900">
            {activeAssignment?.startTime
              ? formatDateTime(activeAssignment.startTime)
              : 'Nicht zugewiesen'}
          </div>
        </Card>
      </div>

      {activeAssignment && currentEnclosureName ? (
        <Card className="mt-4 px-4 py-4 text-sm text-[#17130f]">
          <div className="font-medium">{currentEnclosureName}</div>
          <div className="mt-1">
            Verweildauer {formatDurationFromIso(activeAssignment.startTime)}
          </div>
          {activeAssignment.notes ? <div className="mt-1">{activeAssignment.notes}</div> : null}
          <FormButton
            type="button"
            onClick={() => void onEndAssignment(activeAssignment)}
            disabled={endingAssignmentId === activeAssignment.id}
            variant="secondary"
            className="mt-3"
          >
            {endingAssignmentId === activeAssignment.id
              ? 'Weist aus ...'
              : 'Aus aktuellem Pferch ausweisen'}
          </FormButton>
        </Card>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <div>
            <div className="mb-1 text-sm font-medium text-neutral-700">Pferch wählen</div>
            <div className="flex flex-wrap gap-2 rounded-[1.35rem] border-2 border-[#ccb98a] bg-[#fffdf6] p-2">
              {availableEnclosures.map((enclosure) => {
                const isSelected = enclosure.id === selectedEnclosureId

                return (
                  <button
                    key={enclosure.id}
                    type="button"
                    onClick={() => onSelectedEnclosureIdChange(enclosure.id)}
                    aria-pressed={isSelected}
                    className={[
                      'rounded-[1rem] px-3 py-2 text-left text-sm font-semibold transition',
                      isSelected
                        ? 'border border-[#5a5347] bg-[#f1efeb] text-[#17130f]'
                        : 'border border-transparent bg-[#fffdf6] text-neutral-900 hover:border-[#ccb98a]',
                    ].join(' ')}
                  >
                    {enclosure.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField>
              <FormLabel>Tierzahl</FormLabel>
              <FormInput
                type="number"
                min="0"
                inputMode="numeric"
                value={assignmentCount}
                onChange={(event) => onAssignmentCountChange(event.target.value)}
                placeholder="automatisch aus Herde"
              />
            </FormField>

            <FormField>
              <FormLabel>Notiz</FormLabel>
              <FormInput
                value={assignmentNotes}
                onChange={(event) => onAssignmentNotesChange(event.target.value)}
                placeholder="optionale Bemerkung"
              />
            </FormField>
          </div>

          {assignmentError && (
            <ErrorAlert>{assignmentError}</ErrorAlert>
          )}

          <FormButton
            type="submit"
            disabled={assignmentSaving || !selectedEnclosureId}
            variant="primary"
          >
            {assignmentSaving ? 'Speichert ...' : 'In Pferch einweisen'}
          </FormButton>
        </form>
      )}

      <div className="mt-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-700">
          Letzte Aufenthalte
        </h3>
        {recentAssignments.length === 0 ? (
          <Alert variant="info" className="mt-2 text-sm text-neutral-700">
            Noch keine Pferchwechsel für diese Herde vorhanden.
          </Alert>
        ) : (
          <div className="mt-3 space-y-2">
            {recentAssignments.map((assignment) => {
              const enclosure = enclosuresById.get(assignment.enclosureId)

              return (
                <Card key={assignment.id} className="px-4 py-3 text-sm shadow-sm">
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
                    Dauer {formatDurationFromIso(assignment.startTime, assignment.endTime)} ·
                    {' '}
                    Besatz {assignment.count ?? effectiveHerdCount ?? 'unbekannt'}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
      </CardContent>
    </Card>
  )
}
