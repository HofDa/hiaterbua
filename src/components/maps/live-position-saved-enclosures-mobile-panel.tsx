'use client'

import {
  enclosureFilterOptions,
  getAssignableHerds,
  getEnclosureOccupancySummary,
} from '@/lib/maps/live-position-map-helpers'
import { cn } from '@/lib/utils/cn'
import { CollapseChevron } from '@/components/ui/collapse-chevron'
import { LivePositionMobileAssignmentFlow } from '@/components/maps/live-position-mobile-assignment-flow'
import { LivePositionMobileEnclosureDetail } from '@/components/maps/live-position-mobile-enclosure-detail'
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

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'

type LivePositionSavedEnclosuresMobilePanelProps = {
  filteredEnclosures: FilteredEnclosureItem[]
  enclosureListFilter: EnclosureListFilter
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
  showSelectedTrack: boolean
  onEnclosureListFilterChange: (filter: EnclosureListFilter) => void
  onSelectedEnclosureChange: (nextId: string) => void
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

export function LivePositionSavedEnclosuresMobilePanel({
  filteredEnclosures,
  enclosureListFilter,
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
  showSelectedTrack,
  onEnclosureListFilterChange,
  onSelectedEnclosureChange,
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
  const assignmentFlowItem =
    filteredEnclosures.find(({ enclosure }) => enclosure.id === assignmentEditorEnclosureId) ??
    null
  const isAssignmentFlowOpen = Boolean(assignmentFlowItem)

  return (
    <div className="rounded-[1.4rem] border-2 border-border-ink bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Gespeicherte Pferche</h2>
        <span className="text-sm text-ink-soft">{filteredEnclosures.length}</span>
      </div>

      {!isAssignmentFlowOpen ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
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

      {assignmentFlowItem ? (
        <div className="mt-4">
          <LivePositionMobileAssignmentFlow
            key={assignmentFlowItem.enclosure.id}
            enclosure={assignmentFlowItem.enclosure}
            assignmentHerdId={assignmentHerdId}
            assignmentCount={assignmentCount}
            assignmentNotes={assignmentNotes}
            assignmentError={assignmentError}
            isAssignmentSaving={isAssignmentSaving}
            safeHerds={safeHerds}
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
            {filteredEnclosures.map(({ enclosure, activeAssignment, stats }) => {
              const isActive = Boolean(activeAssignment)
              const isSelected = selectedEnclosureId === enclosure.id
              const hasAssignableHerds =
                getAssignableHerds(safeHerds, activeAssignmentsByHerdId, enclosure.id).length > 0
              const rowSubtitle = getEnclosureOccupancySummary(
                enclosure,
                activeAssignment,
                stats,
                herdsById,
              )

              return (
                <div
                  key={enclosure.id}
                  className={cn(
                    'rounded-[1.1rem] border border-border bg-surface-raised',
                    isSelected && 'border-border-strong bg-accent',
                  )}
                >
                  <div className="flex items-center gap-3 px-3.5 py-2.5">
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
                      aria-expanded={isSelected}
                      className={cn(
                        'flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg py-1 text-left',
                        focusRing,
                      )}
                    >
                      <span className="min-w-0">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-semibold text-ink">
                            {enclosure.name}
                          </span>
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
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-ink-muted">
                          {rowSubtitle}
                        </span>
                      </span>
                      <CollapseChevron open={isSelected} className="shrink-0" />
                    </button>
                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => activeAssignment && onEndEnclosureAssignment(activeAssignment)}
                        disabled={endingAssignmentId === activeAssignment?.id}
                        className={cn(
                          'inline-flex shrink-0 items-center justify-center rounded-full border border-warning-border bg-warning-surface px-3.5 py-2 text-xs font-semibold text-warning-ink disabled:opacity-50',
                          focusRing,
                        )}
                      >
                        {endingAssignmentId === activeAssignment?.id ? 'Weist aus ...' : 'Ausweisen'}
                      </button>
                    ) : hasAssignableHerds ? (
                      <button
                        type="button"
                        onClick={() => onOpenAssignmentEditor(enclosure)}
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

                  {isSelected ? (
                    <LivePositionMobileEnclosureDetail
                      enclosure={enclosure}
                      activeAssignment={activeAssignment}
                      herdsById={herdsById}
                      animalsByHerdId={animalsByHerdId}
                      showSelectedTrack={showSelectedTrack}
                      onToggleShowSelectedTrack={onToggleShowSelectedTrack}
                      onStartEditEnclosure={onStartEditEnclosure}
                      onDeleteEnclosure={onDeleteEnclosure}
                    />
                  ) : null}
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
    </div>
  )
}
