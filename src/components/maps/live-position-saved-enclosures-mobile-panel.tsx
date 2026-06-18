'use client'

import { useState } from 'react'
import {
  formatDateTime,
  getAssignableHerds,
  getEffectiveHerdCount,
} from '@/lib/maps/live-position-map-helpers'
import { formatArea } from '@/lib/maps/map-core'
import { FormField, FormLabel, FormTextarea } from '@/components/ui/form'
import { ErrorAlert } from '@/components/ui/alert'
import { cn } from '@/lib/utils/cn'
import {
  FlowCountCard,
  FlowEmptyState,
  FlowOptionGrid,
  FlowPrimaryAction,
  FlowSecondaryAction,
  FlowSelectableTile,
  FlowStepperButton,
  FlowStepHeader,
  FlowSummaryCallout,
} from '@/components/ui/mobile-flow'
import { MetaLabel } from '@/components/ui/typography'
import type { FilteredEnclosureItem } from '@/lib/maps/live-position-map-helpers'
import type {
  Animal,
  Enclosure,
  EnclosureAssignment,
  Herd,
} from '@/types/domain'

type LivePositionSavedEnclosuresMobilePanelProps = {
  filteredEnclosures: FilteredEnclosureItem[]
  selectedEnclosure: Enclosure | null
  selectedEnclosureId: string | null
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
  isSelectedEnclosureInfoOpen: boolean
  showSelectedTrack: boolean
  onSelectedEnclosureChange: (nextId: string) => void
  onToggleSelectedEnclosureInfo: () => void
  onToggleShowSelectedTrack: () => void
  onOpenAssignmentEditor: (enclosure: Enclosure) => void
  onCancelAssignmentEditor: () => void
  onAssignHerdToEnclosure: (enclosure: Enclosure) => void
  onAssignmentHerdIdChange: (nextHerdId: string) => void
  onAssignmentCountChange: (value: string) => void
  onAssignmentNotesChange: (value: string) => void
  onEndEnclosureAssignment: (assignment: EnclosureAssignment) => void
}

type LivePositionMobileAssignmentFlowProps = {
  enclosure: Enclosure
  assignmentHerdId: string
  assignmentCount: string
  assignmentNotes: string
  assignmentError: string
  isAssignmentSaving: boolean
  safeHerds: Herd[]
  herdsById: Map<string, Herd>
  activeAssignmentsByHerdId: Map<string, EnclosureAssignment>
  onCancelAssignmentEditor: () => void
  onAssignHerdToEnclosure: (enclosure: Enclosure) => void
  onAssignmentHerdIdChange: (nextHerdId: string) => void
  onAssignmentCountChange: (value: string) => void
  onAssignmentNotesChange: (value: string) => void
}

type LivePositionMobileActiveAssignmentCardProps = {
  activeAssignment: EnclosureAssignment
  herdsById: Map<string, Herd>
  animalsByHerdId: Map<string, Animal[]>
  endingAssignmentId: string | null
  onEndEnclosureAssignment: (assignment: EnclosureAssignment) => void
}

function LivePositionMobileAssignmentFlow({
  enclosure,
  assignmentHerdId,
  assignmentCount,
  assignmentNotes,
  assignmentError,
  isAssignmentSaving,
  safeHerds,
  herdsById,
  activeAssignmentsByHerdId,
  onCancelAssignmentEditor,
  onAssignHerdToEnclosure,
  onAssignmentHerdIdChange,
  onAssignmentCountChange,
  onAssignmentNotesChange,
}: LivePositionMobileAssignmentFlowProps) {
  const [step, setStep] = useState<'herd' | 'count' | 'confirm'>('herd')
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const assignableHerds = getAssignableHerds(safeHerds, activeAssignmentsByHerdId, enclosure.id)
  const selectedHerd =
    assignableHerds.find((herd) => herd.id === assignmentHerdId) ??
    herdsById.get(assignmentHerdId) ??
    null
  const parsedCount = Number.parseInt(assignmentCount.trim(), 10)
  const animalCount = Number.isFinite(parsedCount) ? parsedCount : 0
  const hasSelectedAssignmentHerd = assignableHerds.some((herd) => herd.id === assignmentHerdId)

  function handleBack() {
    if (step === 'confirm') {
      setStep('count')
      return
    }

    if (step === 'count') {
      setStep('herd')
      return
    }

    onCancelAssignmentEditor()
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-raised px-4 py-4 shadow-sm">
      <FlowStepHeader
        label={enclosure.name}
        sublabel={
          step === 'herd'
            ? '1. Herde wählen'
            : step === 'count'
              ? '2. Tierzahl'
              : '3. Herde zuweisen'
        }
        onBack={handleBack}
      />

      {step === 'herd' ? (
        <div className="mt-3 space-y-3">
          {assignableHerds.length === 0 ? (
            <FlowEmptyState className="rounded-[1.25rem]">
              Alle aktiven Herden sind bereits anderen Pferchen zugewiesen.
            </FlowEmptyState>
          ) : (
            <FlowOptionGrid>
              {assignableHerds.map((herd) => {
                const isSelected = assignmentHerdId === herd.id

                return (
                  <FlowSelectableTile
                    key={herd.id}
                    onClick={() => {
                      onAssignmentHerdIdChange(herd.id)
                      setStep('count')
                    }}
                    pressed={isSelected}
                  >
                    {herd.name}
                  </FlowSelectableTile>
                )
              })}
            </FlowOptionGrid>
          )}
        </div>
      ) : null}

      {step === 'count' ? (
        <div className="mt-3 space-y-3">
          <FlowSummaryCallout
            label={selectedHerd?.name ?? 'Herde wählen'}
            sublabel="Tiere im Pferch"
          />

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

            <FlowSecondaryAction
              onClick={() => setStep('confirm')}
              disabled={!hasSelectedAssignmentHerd}
              className="col-span-2 rounded-2xl border-border-strong bg-surface-muted font-medium text-ink disabled:opacity-50"
            >
              Weiter
            </FlowSecondaryAction>
          </div>
        </div>
      ) : null}

      {step === 'confirm' ? (
        <div className="mt-3 space-y-3">
          <FlowSummaryCallout
            label={selectedHerd?.name ?? 'Herde wählen'}
            sublabel={`${animalCount} Tiere bereit`}
          />

          <FlowPrimaryAction
            onClick={() => onAssignHerdToEnclosure(enclosure)}
            disabled={isAssignmentSaving || !hasSelectedAssignmentHerd}
          >
            {isAssignmentSaving ? 'Speichert ...' : 'Herde zuweisen'}
          </FlowPrimaryAction>

          <FlowSecondaryAction
            onClick={() => setIsDetailsOpen((current) => !current)}
            aria-expanded={isDetailsOpen}
          >
            {isDetailsOpen ? 'Details ausblenden' : 'Details'}
          </FlowSecondaryAction>

          {isDetailsOpen ? (
            <FormField>
              <FormLabel>Notiz</FormLabel>
              <FormTextarea
                rows={3}
                value={assignmentNotes}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => onAssignmentNotesChange(event.target.value)}
                placeholder="optionale Bemerkung zur Belegung"
              />
            </FormField>
          ) : null}
        </div>
      ) : null}

      {assignmentError && (
        <ErrorAlert className="mt-3">{assignmentError}</ErrorAlert>
      )}
    </div>
  )
}

function LivePositionMobileActiveAssignmentCard({
  activeAssignment,
  herdsById,
  animalsByHerdId,
  endingAssignmentId,
  onEndEnclosureAssignment,
}: LivePositionMobileActiveAssignmentCardProps) {
  const activeHerd = herdsById.get(activeAssignment.herdId)
  const effectiveCount =
    activeAssignment.count ??
    getEffectiveHerdCount(activeHerd, animalsByHerdId.get(activeAssignment.herdId) ?? [])

  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface-raised px-4 py-4 shadow-sm">
      <MetaLabel tracking="wide" tone="soft">
        Belegung
      </MetaLabel>
      <div className="mt-1 text-sm font-semibold text-ink-strong">
        {activeHerd?.name ?? 'Unbekannte Herde'}
      </div>
      <div className="mt-2 text-sm text-ink-muted">
        Seit {formatDateTime(activeAssignment.startTime)}
      </div>
      <div className="mt-1 text-sm text-ink-muted">
        Besatz {effectiveCount ?? 'unbekannt'}
      </div>
      {activeAssignment.notes ? (
        <div className="mt-1 text-sm text-ink-muted">{activeAssignment.notes}</div>
      ) : null}
      <button
        type="button"
        onClick={() => onEndEnclosureAssignment(activeAssignment)}
        disabled={endingAssignmentId === activeAssignment.id}
        className="mt-3 w-full rounded-2xl border border-warning-border bg-warning-surface px-4 py-3 text-sm font-semibold text-warning-ink disabled:opacity-50"
      >
        {endingAssignmentId === activeAssignment.id ? 'Weist aus ...' : 'Herde ausweisen'}
      </button>
    </div>
  )
}

export function LivePositionSavedEnclosuresMobilePanel({
  filteredEnclosures,
  selectedEnclosure,
  selectedEnclosureId,
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
  isSelectedEnclosureInfoOpen,
  showSelectedTrack,
  onSelectedEnclosureChange,
  onToggleSelectedEnclosureInfo,
  onToggleShowSelectedTrack,
  onOpenAssignmentEditor,
  onCancelAssignmentEditor,
  onAssignHerdToEnclosure,
  onAssignmentHerdIdChange,
  onAssignmentCountChange,
  onAssignmentNotesChange,
  onEndEnclosureAssignment,
}: LivePositionSavedEnclosuresMobilePanelProps) {
  const detailEnclosureId = selectedEnclosureId ?? assignmentEditorEnclosureId
  const detailItem =
    filteredEnclosures.find(({ enclosure }) => enclosure.id === detailEnclosureId) ?? null
  const detailEnclosure = selectedEnclosure ?? detailItem?.enclosure ?? null
  const isAssignmentFlowOpen =
    Boolean(assignmentEditorEnclosureId) &&
    detailItem?.enclosure.id === assignmentEditorEnclosureId

  return (
    <div className="rounded-[1.4rem] border-2 border-border-ink bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Gespeicherte Pferche</h2>
        <span className="text-sm text-ink-soft">{filteredEnclosures.length}</span>
      </div>

      {isAssignmentFlowOpen && detailItem ? (
        <div className="mt-4">
          <LivePositionMobileAssignmentFlow
            key={detailItem.enclosure.id}
            enclosure={detailItem.enclosure}
            assignmentHerdId={assignmentHerdId}
            assignmentCount={assignmentCount}
            assignmentNotes={assignmentNotes}
            assignmentError={assignmentError}
            isAssignmentSaving={isAssignmentSaving}
            safeHerds={safeHerds}
            herdsById={herdsById}
            activeAssignmentsByHerdId={activeAssignmentsByHerdId}
            onCancelAssignmentEditor={onCancelAssignmentEditor}
            onAssignHerdToEnclosure={onAssignHerdToEnclosure}
            onAssignmentHerdIdChange={onAssignmentHerdIdChange}
            onAssignmentCountChange={onAssignmentCountChange}
            onAssignmentNotesChange={onAssignmentNotesChange}
          />
        </div>
      ) : (
        <div className="mt-4 max-h-[48vh] overflow-y-auto pr-1 overscroll-contain">
          <div className="flex flex-wrap gap-3">
            {filteredEnclosures.map(({ enclosure, activeAssignment }) => {
              const isActive = Boolean(activeAssignment)
              const isSelected = selectedEnclosureId === enclosure.id
              const hasAssignableHerds =
                getAssignableHerds(safeHerds, activeAssignmentsByHerdId, enclosure.id).length > 0

              return (
                <div
                  key={enclosure.id}
                  className={cn(
                    'min-w-[45%] flex-1 rounded-[1.1rem] border border-border bg-surface-raised p-3 shadow-sm',
                    isSelected && 'border-border-strong bg-accent',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        assignmentEditorEnclosureId &&
                        assignmentEditorEnclosureId !== enclosure.id
                      ) {
                        onCancelAssignmentEditor()
                      }
                      onSelectedEnclosureChange(enclosure.id)
                    }}
                    className="flex w-full items-center justify-between text-left text-sm font-semibold text-ink"
                  >
                    <span className="truncate">{enclosure.name}</span>
                    <span className="text-xs text-ink-soft">
                      {isActive ? 'aktiv' : 'frei'}
                    </span>
                  </button>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => activeAssignment && onEndEnclosureAssignment(activeAssignment)}
                        className="flex-1 rounded-2xl border border-warning-border bg-warning-surface px-3 py-2 text-xs font-semibold text-warning-ink"
                      >
                        Herde ausweisen
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectedEnclosureChange(enclosure.id)
                          onOpenAssignmentEditor(enclosure)
                        }}
                        disabled={!hasAssignableHerds}
                        className="flex-1 rounded-2xl border border-border-strong bg-surface-muted px-3 py-2 text-xs font-semibold text-ink disabled:opacity-50"
                      >
                        {hasAssignableHerds ? 'Herde zuweisen' : 'Keine Herde frei'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {filteredEnclosures.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">
          Für diesen Filter gibt es aktuell keine Pferche.
        </p>
      ) : null}

      {detailEnclosure && !isAssignmentFlowOpen ? (
        <>
          <div className="mt-4 rounded-2xl border border-border-soft bg-accent px-4 py-3 text-sm text-ink">
            <button
              type="button"
              onClick={onToggleSelectedEnclosureInfo}
              aria-expanded={isSelectedEnclosureInfoOpen}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="min-w-0 break-words">
                Fokus: <span className="font-medium">{detailEnclosure.name}</span>
              </span>
              <span className="shrink-0 text-base text-ink">
                {isSelectedEnclosureInfoOpen ? '−' : '+'}
              </span>
            </button>
            {isSelectedEnclosureInfoOpen ? (
              <>
                <div className="mt-2">
                  {formatArea(detailEnclosure.areaM2)} · {detailEnclosure.pointsCount ?? 0} Punkte
                </div>
                {detailEnclosure.notes ? (
                  <div className="mt-1 text-ink-muted">{detailEnclosure.notes}</div>
                ) : null}
              </>
            ) : null}
          </div>

          {detailItem?.activeAssignment ? (
            <LivePositionMobileActiveAssignmentCard
              activeAssignment={detailItem.activeAssignment}
              herdsById={herdsById}
              animalsByHerdId={animalsByHerdId}
              endingAssignmentId={endingAssignmentId}
              onEndEnclosureAssignment={onEndEnclosureAssignment}
            />
          ) : null}
        </>
      ) : null}

      {detailEnclosure?.method === 'walk' ? (
        <button
          type="button"
          onClick={onToggleShowSelectedTrack}
          className="mt-4 w-full rounded-2xl bg-surface-raised px-4 py-3 text-sm font-medium text-ink"
        >
          {showSelectedTrack ? 'Spur ausblenden' : 'Spur anzeigen'}
        </button>
      ) : null}
    </div>
  )
}
