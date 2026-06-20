'use client'

import type { EnclosureListFilter } from '@/lib/maps/live-position-map-helpers'
import { LivePositionSavedEnclosureCard } from '@/components/maps/live-position-saved-enclosure-card'
import { LivePositionSurveyAreasPanel } from '@/components/maps/live-position-survey-areas-panel'
import { useLivePositionMapStore } from '@/components/maps/hooks/use-live-position-map-store'
import { cn } from '@/lib/utils/cn'
import type { Enclosure } from '@/types/domain'

const enclosureFilterOptions: { id: EnclosureListFilter; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'active', label: 'Aktiv belegt' },
  { id: 'unused', label: 'Ohne Nutzung' },
  { id: 'most-used', label: 'Meist genutzt' },
]

export type LivePositionSidebarPanelProps = {
  onFocusEnclosure: (enclosure: Enclosure) => void
  onStartEditEnclosure: (enclosure: Enclosure) => void
}

export function LivePositionSidebarPanel({
  onFocusEnclosure,
  onStartEditEnclosure,
}: LivePositionSidebarPanelProps) {
  const {
    safeSurveyAreas,
    selectedSurveyArea,
    selectedSurveyAreaId,
    filteredEnclosures,
    enclosureListFilter,
    selectedEnclosure,
    selectedEnclosureId,
    expandedSavedEnclosureId,
    assignmentEditorEnclosureId,
    assignmentHerdId,
    assignmentCount,
    assignmentNotes,
    assignmentError,
    isAssignmentSaving,
    endingAssignmentId,
    showSelectedTrack,
    selectedTrackSummary,
    safeHerds,
    herdsById,
    animalsByHerdId,
    activeAssignmentsByHerdId,
    assignmentHistoryByEnclosureId,
    editingEnclosureId,
    editName,
    editNotes,
    editError,
    isEditing,
    editGeometryPointsLength,
    editAreaM2,
    selectedEditPointIndex,
    isAddingEditPoint,
  } = useLivePositionMapStore((state) => state.sidebar)
  const {
    onFocusSurveyArea,
    onEnclosureListFilterChange,
    onExpandedSavedEnclosureChange,
    onToggleShowSelectedTrack,
    onDeleteEnclosure,
    onOpenAssignmentEditor,
    onCancelAssignmentEditor,
    onAssignHerdToEnclosure,
    onAssignmentHerdIdChange,
    onAssignmentCountChange,
    onAssignmentNotesChange,
    onEndEnclosureAssignment,
    onEditNameChange,
    onEditNotesChange,
    onStartAddEditPoint,
    onRemoveSelectedEditPoint,
    onSaveEditedEnclosure,
    onCancelEditEnclosure,
  } = useLivePositionMapStore((state) => state.sidebarHandles)
  function renderSurveyAreasPanel() {
    return (
      <LivePositionSurveyAreasPanel
        safeSurveyAreas={safeSurveyAreas}
        selectedSurveyArea={selectedSurveyArea}
        selectedSurveyAreaId={selectedSurveyAreaId}
        onFocusSurveyArea={onFocusSurveyArea}
      />
    )
  }

  function renderSelectedEnclosureNotice() {
    if (!selectedEnclosure) {
      return null
    }

    return (
        <div className="mt-4 rounded-2xl border border-border-soft bg-accent px-4 py-3 text-sm text-ink break-words">
        Fokus: <span className="font-medium">{selectedEnclosure.name}</span>. Auf ein Polygon in der Karte tippen, um die Bearbeitung direkt zu öffnen.
      </div>
    )
  }

  function renderEnclosureListContent() {
    if (filteredEnclosures.length === 0) {
      return (
        <p className="mt-3 text-sm text-ink-muted">
          Für diesen Filter gibt es aktuell keine Pferche.
        </p>
      )
    }

    return (
      <div className="mt-4 space-y-3">
        {filteredEnclosures.map((item) => (
          <LivePositionSavedEnclosureCard
            key={item.enclosure.id}
            item={item}
            selectedEnclosureId={selectedEnclosureId}
            expandedSavedEnclosureId={expandedSavedEnclosureId}
            assignmentEditorEnclosureId={assignmentEditorEnclosureId}
            assignmentHerdId={assignmentHerdId}
            assignmentCount={assignmentCount}
            assignmentNotes={assignmentNotes}
            assignmentError={assignmentError}
            isAssignmentSaving={isAssignmentSaving}
            endingAssignmentId={endingAssignmentId}
            showSelectedTrack={showSelectedTrack}
            selectedTrackSummary={selectedTrackSummary}
            safeHerds={safeHerds}
            herdsById={herdsById}
            animalsByHerdId={animalsByHerdId}
            activeAssignmentsByHerdId={activeAssignmentsByHerdId}
            assignmentHistoryByEnclosureId={assignmentHistoryByEnclosureId}
            editingEnclosureId={editingEnclosureId}
            editName={editName}
            editNotes={editNotes}
            editError={editError}
            isEditing={isEditing}
            editGeometryPointsLength={editGeometryPointsLength}
            editAreaM2={editAreaM2}
            selectedEditPointIndex={selectedEditPointIndex}
            isAddingEditPoint={isAddingEditPoint}
            onExpandedSavedEnclosureChange={onExpandedSavedEnclosureChange}
            onFocusEnclosure={onFocusEnclosure}
            onStartEditEnclosure={onStartEditEnclosure}
            onToggleShowSelectedTrack={onToggleShowSelectedTrack}
            onDeleteEnclosure={onDeleteEnclosure}
            onOpenAssignmentEditor={onOpenAssignmentEditor}
            onCancelAssignmentEditor={onCancelAssignmentEditor}
            onAssignHerdToEnclosure={onAssignHerdToEnclosure}
            onAssignmentHerdIdChange={onAssignmentHerdIdChange}
            onAssignmentCountChange={onAssignmentCountChange}
            onAssignmentNotesChange={onAssignmentNotesChange}
            onEndEnclosureAssignment={onEndEnclosureAssignment}
            onEditNameChange={onEditNameChange}
            onEditNotesChange={onEditNotesChange}
            onStartAddEditPoint={onStartAddEditPoint}
            onRemoveSelectedEditPoint={onRemoveSelectedEditPoint}
            onSaveEditedEnclosure={onSaveEditedEnclosure}
            onCancelEditEnclosure={onCancelEditEnclosure}
          />
        ))}
      </div>
    )
  }

  function renderSavedEnclosuresPanel() {
    return (
      <>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Gespeicherte Pferche</h2>
          <span className="text-sm text-ink-soft">{filteredEnclosures.length}</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {enclosureFilterOptions.map((filterOption) => (
            <button
              key={filterOption.id}
              type="button"
              onClick={() => onEnclosureListFilterChange(filterOption.id)}
              className={cn(
                'rounded-2xl px-3 py-3 text-sm font-medium',
                enclosureListFilter === filterOption.id
                  ? 'border border-border-strong bg-surface-muted text-ink'
                  : 'bg-surface-muted text-ink-strong',
              )}
            >
              {filterOption.label}
            </button>
          ))}
        </div>

        {renderSelectedEnclosureNotice()}
        <div className="pb-1">{renderEnclosureListContent()}</div>
      </>
    )
  }

  return (
    <>
      {/* Mobile only needs the survey-areas reference here; the saved-Pferche list
          is owned by the workflow panel's "Pferche" tab (single source of truth). */}
      <div className="min-w-0 lg:hidden">
        <div className="min-w-0 overflow-hidden app-panel p-5">
          <LivePositionSurveyAreasPanel
            safeSurveyAreas={safeSurveyAreas}
            selectedSurveyArea={selectedSurveyArea}
            selectedSurveyAreaId={selectedSurveyAreaId}
            onFocusSurveyArea={onFocusSurveyArea}
          />
        </div>
      </div>

      <section className="hidden h-[calc(100vh-8rem)] flex-col overflow-hidden app-panel p-5 lg:flex">
        <div className="min-w-0 border-b border-border pb-4">
          <h2 className="text-lg font-semibold text-ink-strong">Pferche & Flächen</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {safeSurveyAreas.length} Flächen · {filteredEnclosures.length} Pferche
          </p>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 space-y-4">
          {renderSurveyAreasPanel()}
          {renderSavedEnclosuresPanel()}
        </div>
      </section>
    </>
  )
}
