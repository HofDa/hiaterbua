'use client'

import {
  formatDateTime,
  formatDurationFromIso,
  getEffectiveHerdCount,
  getAssignableHerds,
} from '@/lib/maps/live-position-map-helpers'
import { FormField, FormLabel, FormTextarea } from '@/components/ui/form'
import { ErrorAlert } from '@/components/ui/alert'
import { MetaLabel } from '@/components/ui/typography'
import { cn } from '@/lib/utils/cn'
import type {
  Animal,
  Enclosure,
  EnclosureAssignment,
  Herd,
} from '@/types/domain'

type LivePositionEnclosureAssignmentPanelProps = {
  enclosure: Enclosure
  activeAssignment: EnclosureAssignment | null
  assignmentEditorEnclosureId: string | null
  assignmentHerdId: string
  assignmentCount: string
  assignmentNotes: string
  assignmentError: string
  isAssignmentSaving: boolean
  endingAssignmentId: string | null
  safeHerds: Herd[]
  herdsById: Map<string, Herd>
  animalsByHerdId: Map<string, Animal[]>
  activeAssignmentsByHerdId: Map<string, EnclosureAssignment>
  assignmentHistoryByEnclosureId: Map<string, EnclosureAssignment[]>
  onOpenAssignmentEditor: (enclosure: Enclosure) => void
  onCancelAssignmentEditor: () => void
  onAssignHerdToEnclosure: (enclosure: Enclosure) => void
  onAssignmentHerdIdChange: (nextHerdId: string) => void
  onAssignmentCountChange: (value: string) => void
  onAssignmentNotesChange: (value: string) => void
  onEndEnclosureAssignment: (assignment: EnclosureAssignment) => void
}

export function LivePositionEnclosureAssignmentPanel({
  enclosure,
  activeAssignment,
  assignmentEditorEnclosureId,
  assignmentHerdId,
  assignmentCount,
  assignmentNotes,
  assignmentError,
  isAssignmentSaving,
  endingAssignmentId,
  safeHerds,
  herdsById,
  animalsByHerdId,
  activeAssignmentsByHerdId,
  assignmentHistoryByEnclosureId,
  onOpenAssignmentEditor,
  onCancelAssignmentEditor,
  onAssignHerdToEnclosure,
  onAssignmentHerdIdChange,
  onAssignmentCountChange,
  onAssignmentNotesChange,
  onEndEnclosureAssignment,
}: LivePositionEnclosureAssignmentPanelProps) {
  const assignmentHistory = assignmentHistoryByEnclosureId.get(enclosure.id)?.slice(0, 4) ?? []
  const activeHerd = activeAssignment ? herdsById.get(activeAssignment.herdId) : null
  const effectiveCurrentCount =
    activeAssignment && activeHerd
      ? activeAssignment.count ??
        getEffectiveHerdCount(activeHerd, animalsByHerdId.get(activeHerd.id) ?? [])
      : null
  const assignableHerds = getAssignableHerds(
    safeHerds,
    activeAssignmentsByHerdId,
    enclosure.id
  )
  const hasAssignableHerds = assignableHerds.length > 0
  const hasSelectedAssignmentHerd = assignableHerds.some((herd) => herd.id === assignmentHerdId)

  function handleAdjustAssignmentCount(delta: number) {
    const parsedCount = Number.parseInt(assignmentCount.trim(), 10)
    const currentCount = Number.isFinite(parsedCount) ? parsedCount : 0
    const nextCount = Math.max(0, currentCount + delta)

    onAssignmentCountChange(String(nextCount))
  }

  return (
    <>
      <div className="rounded-2xl bg-surface-raised px-4 py-3 text-sm text-ink-muted">
        <MetaLabel tracking="wide" tone="soft">
          Belegung
        </MetaLabel>
        {activeAssignment && activeHerd ? (
          <div className="mt-2">
            <div className="font-medium text-ink">{activeHerd.name}</div>
            <div className="mt-1">
              Seit{' '}
              <span className="font-medium text-ink">
                {formatDateTime(activeAssignment.startTime)}
              </span>
            </div>
            <div className="mt-1">
              Verweildauer{' '}
              <span className="font-medium text-ink">
                {formatDurationFromIso(activeAssignment.startTime)}
              </span>
            </div>
            <div className="mt-1">
              Besatz{' '}
              <span className="font-medium text-ink">
                {effectiveCurrentCount ?? 'unbekannt'}
              </span>
            </div>
            {activeAssignment.notes ? (
              <div className="mt-1 text-ink-muted">{activeAssignment.notes}</div>
            ) : null}
          </div>
        ) : (
          <div className="mt-2 text-ink-muted">Aktuell keiner Herde zugewiesen.</div>
        )}
      </div>

      {activeAssignment ? (
        <button
          type="button"
          onClick={() => onEndEnclosureAssignment(activeAssignment)}
          disabled={endingAssignmentId === activeAssignment.id}
          className="w-full rounded-2xl border border-border bg-surface-raised px-4 py-3 text-sm font-medium text-ink disabled:opacity-50"
        >
          {endingAssignmentId === activeAssignment.id ? 'Weist aus ...' : 'Herde ausweisen'}
        </button>
      ) : assignmentEditorEnclosureId === enclosure.id ? (
        <div className="min-w-0 overflow-hidden rounded-2xl bg-surface-raised px-4 py-4">
          <div className="text-sm font-medium text-ink">Herde zuweisen</div>
          <div className="mt-3 min-w-0 space-y-3">
            <div className="min-w-0">
              <div className="mb-1 text-sm font-medium text-ink-muted">Herde</div>
              <div className="grid grid-cols-2 gap-2 rounded-[1.35rem] border-2 border-border bg-surface-raised p-2 text-sm">
                {assignableHerds.map((herd) => (
                    <button
                      key={herd.id}
                      type="button"
                      onClick={() => onAssignmentHerdIdChange(herd.id)}
                      className={cn(
                        'rounded-[1rem] px-3 py-2 text-left transition',
                        assignmentHerdId === herd.id
                          ? 'border border-border-strong bg-surface-muted text-ink'
                          : 'border border-transparent bg-surface-raised text-ink hover:border-border',
                      )}
                    >
                      {herd.name}
                    </button>
                  ))}
              </div>
              {!hasAssignableHerds ? (
                <div className="mt-2 rounded-2xl border border-dashed border-border bg-surface-warm px-3 py-3 text-sm text-ink-muted">
                  Alle aktiven Herden sind bereits anderen Pferchen zugewiesen.
                </div>
              ) : null}
            </div>

            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium">Tierzahl</label>
              <div className="flex min-w-0 items-center gap-2 rounded-[1.35rem] border-2 border-border bg-surface-raised px-2 py-2">
                <button
                  type="button"
                  onClick={() => handleAdjustAssignmentCount(-1)}
                  disabled={!hasSelectedAssignmentHerd || Number.parseInt(assignmentCount || '0', 10) <= 0}
                  aria-label="Tierzahl verringern"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border border-border-strong bg-surface-muted text-lg font-semibold text-ink disabled:opacity-40"
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  className="w-full min-w-0 flex-1 rounded-2xl border border-border bg-surface-raised px-3 py-2.5 text-center"
                  value={assignmentCount}
                  onChange={(event) => onAssignmentCountChange(event.target.value)}
                  placeholder="automatisch"
                />
                <button
                  type="button"
                  onClick={() => handleAdjustAssignmentCount(1)}
                  disabled={!hasSelectedAssignmentHerd}
                  aria-label="Tierzahl erhöhen"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border border-border-strong bg-surface-muted text-lg font-semibold text-ink disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>

            <FormField className="min-w-0">
              <FormLabel>Notiz</FormLabel>
              <FormTextarea
                rows={2}
                value={assignmentNotes}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => onAssignmentNotesChange(event.target.value)}
                placeholder="optionale Bemerkung zur Belegung"
              />
            </FormField>

            {assignmentError && (
              <ErrorAlert>{assignmentError}</ErrorAlert>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onAssignHerdToEnclosure(enclosure)}
                disabled={isAssignmentSaving || !assignmentHerdId || !hasAssignableHerds}
                className="rounded-2xl border border-border-strong bg-surface-muted px-4 py-3 text-sm font-medium text-ink disabled:opacity-50"
              >
                {isAssignmentSaving ? 'Speichert ...' : 'Zuweisen'}
              </button>
              <button
                type="button"
                onClick={onCancelAssignmentEditor}
                className="rounded-2xl bg-surface-raised px-4 py-3 text-sm font-medium text-ink"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      ) : hasAssignableHerds ? (
        <button
          type="button"
          onClick={() => onOpenAssignmentEditor(enclosure)}
          className="w-full rounded-2xl border border-border bg-surface-raised px-4 py-3 text-sm font-medium text-ink"
        >
          Herde zuweisen
        </button>
      ) : (
        <p className="w-full rounded-2xl bg-surface-raised px-4 py-3 text-center text-sm font-medium text-ink-muted">
          Keine freie Herde
        </p>
      )}

      {assignmentHistory.length > 0 ? (
        <div className="rounded-2xl bg-surface-raised px-4 py-3 text-sm text-ink-muted">
          <MetaLabel tracking="wide" tone="soft">
            Letzte Aufenthalte
          </MetaLabel>
          <div className="mt-2 space-y-2">
            {assignmentHistory.map((assignment) => {
              const herd = herdsById.get(assignment.herdId)
              const count =
                assignment.count ??
                getEffectiveHerdCount(herd, animalsByHerdId.get(assignment.herdId) ?? [])

              return (
                <div key={assignment.id} className="rounded-2xl bg-surface-raised px-3 py-3">
                  <div className="font-medium text-ink">
                    {herd?.name ?? 'Unbekannte Herde'}
                  </div>
                  <div className="mt-1 text-xs text-ink-muted">
                    {formatDateTime(assignment.startTime)}
                    {assignment.endTime ? ` bis ${formatDateTime(assignment.endTime)}` : ' bis jetzt'}
                  </div>
                  <div className="mt-1 text-xs text-ink-muted">
                    Dauer {formatDurationFromIso(assignment.startTime, assignment.endTime)} · Besatz{' '}
                    {count ?? 'unbekannt'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </>
  )
}
