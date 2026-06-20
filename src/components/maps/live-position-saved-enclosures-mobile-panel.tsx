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
import { CollapseChevron } from '@/components/ui/collapse-chevron'
import type {
  EnclosureListFilter,
  FilteredEnclosureItem,
} from '@/lib/maps/live-position-map-helpers'
import type {
  Animal,
  Enclosure,
  EnclosureAssignment,
  Herd,
} from '@/types/domain'

const enclosureFilterOptions: { id: EnclosureListFilter; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'active', label: 'Aktiv belegt' },
  { id: 'unused', label: 'Ohne Nutzung' },
  { id: 'most-used', label: 'Meist genutzt' },
]

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'

type LivePositionSavedEnclosuresMobilePanelProps = {
  filteredEnclosures: FilteredEnclosureItem[]
  enclosureListFilter: EnclosureListFilter
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
  onEnclosureListFilterChange: (filter: EnclosureListFilter) => void
  onSelectedEnclosureChange: (nextId: string) => void
  onToggleSelectedEnclosureInfo: () => void
  onToggleShowSelectedTrack: () => void
  onStartEditEnclosure: (enclosure: Enclosure) => void
  onDeleteEnclosure: (enclosure: Enclosure) => void
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
        className={cn(
          'mt-3 w-full rounded-2xl border border-warning-border bg-warning-surface px-4 py-3 text-sm font-semibold text-warning-ink disabled:opacity-50',
          focusRing,
        )}
      >
        {endingAssignmentId === activeAssignment.id ? 'Weist aus ...' : 'Herde ausweisen'}
      </button>
    </div>
  )
}

export function LivePositionSavedEnclosuresMobilePanel({
  filteredEnclosures,
  enclosureListFilter,
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
  onEnclosureListFilterChange,
  onSelectedEnclosureChange,
  onToggleSelectedEnclosureInfo,
  onToggleShowSelectedTrack,
  onStartEditEnclosure,
  onDeleteEnclosure,
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

      {!isAssignmentFlowOpen ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {enclosureFilterOptions.map((filterOption) => (
            <button
              key={filterOption.id}
              type="button"
              onClick={() => onEnclosureListFilterChange(filterOption.id)}
              className={cn(
                'rounded-2xl px-3 py-2.5 text-sm font-medium',
                focusRing,
                enclosureListFilter === filterOption.id
                  ? 'border border-border-strong bg-surface-muted text-ink'
                  : 'border border-border bg-surface-raised text-ink-soft',
              )}
            >
              {filterOption.label}
            </button>
          ))}
        </div>
      ) : null}

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
          <div className="space-y-2">
            {filteredEnclosures.map(({ enclosure, activeAssignment }) => {
              const isActive = Boolean(activeAssignment)
              const isSelected = selectedEnclosureId === enclosure.id
              const hasAssignableHerds =
                getAssignableHerds(safeHerds, activeAssignmentsByHerdId, enclosure.id).length > 0

              return (
                <div
                  key={enclosure.id}
                  className={cn(
                    'flex items-center gap-3 rounded-[1.1rem] border border-border bg-surface-raised px-3.5 py-2.5',
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
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 text-left',
                      focusRing,
                    )}
                  >
                    <span className="truncate text-sm font-semibold text-ink">{enclosure.name}</span>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        isActive
                          ? 'border border-success-border bg-success-surface text-success-ink'
                          : 'border border-border text-ink-soft',
                      )}
                    >
                      {isActive ? 'aktiv' : 'frei'}
                    </span>
                  </button>
                  {isActive ? (
                    <button
                      type="button"
                      onClick={() => activeAssignment && onEndEnclosureAssignment(activeAssignment)}
                      className={cn(
                        'inline-flex shrink-0 items-center justify-center rounded-full border border-warning-border bg-warning-surface px-3.5 py-2 text-xs font-semibold text-warning-ink',
                        focusRing,
                      )}
                    >
                      Ausweisen
                    </button>
                  ) : hasAssignableHerds ? (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectedEnclosureChange(enclosure.id)
                        onOpenAssignmentEditor(enclosure)
                      }}
                      className={cn(
                        'inline-flex shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-muted px-3.5 py-2 text-xs font-semibold text-ink',
                        focusRing,
                      )}
                    >
                      Zuweisen
                    </button>
                  ) : (
                    <span className="shrink-0 whitespace-nowrap text-xs font-medium text-ink-muted">
                      Keine freie Herde
                    </span>
                  )}
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
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-lg text-left',
                focusRing,
              )}
            >
              <span className="min-w-0 break-words">
                Fokus: <span className="font-medium">{detailEnclosure.name}</span>
              </span>
              <CollapseChevron open={isSelectedEnclosureInfoOpen} />
            </button>
            {isSelectedEnclosureInfoOpen ? (
              <>
                <div className="mt-2">
                  {formatArea(detailEnclosure.areaM2)} · {detailEnclosure.pointsCount ?? 0} Punkte
                </div>
                {detailEnclosure.notes ? (
                  <div className="mt-1 text-ink-muted">{detailEnclosure.notes}</div>
                ) : null}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onStartEditEnclosure(detailEnclosure)}
                    className={cn(
                      'inline-flex items-center justify-center rounded-full border border-border-strong bg-surface-raised px-3 py-2.5 text-xs font-semibold text-ink',
                      focusRing,
                    )}
                  >
                    Bearbeiten
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteEnclosure(detailEnclosure)}
                    className={cn(
                      'inline-flex items-center justify-center rounded-full border border-error-border bg-error-surface px-3 py-2.5 text-xs font-semibold text-error-ink',
                      focusRing,
                    )}
                  >
                    Löschen
                  </button>
                </div>
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
          className={cn(
            'mt-4 w-full rounded-2xl bg-surface-raised px-4 py-3 text-sm font-medium text-ink',
            focusRing,
          )}
        >
          {showSelectedTrack ? 'Spur ausblenden' : 'Spur anzeigen'}
        </button>
      ) : null}
    </div>
  )
}
