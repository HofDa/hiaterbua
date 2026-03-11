'use client'

import type { FormEvent } from 'react'
import {
  type EnclosureListFilter,
  type FilteredEnclosureItem,
  type WalkTrackSummary,
} from '@/lib/maps/live-position-map-helpers'
import { LivePositionSavedEnclosureCard } from '@/components/maps/live-position-saved-enclosure-card'
import { LivePositionSurveyAreasPanel } from '@/components/maps/live-position-survey-areas-panel'
import type {
  Animal,
  Enclosure,
  EnclosureAssignment,
  Herd,
  SurveyArea,
} from '@/types/domain'

const enclosureFilterOptions: { id: EnclosureListFilter; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'active', label: 'Aktiv belegt' },
  { id: 'unused', label: 'Ohne Nutzung' },
  { id: 'most-used', label: 'Meist genutzt' },
]

export type LivePositionSidebarPanelProps = {
  mobilePanel: 'draw' | 'walk' | 'saved'
  safeSurveyAreas: SurveyArea[]
  selectedSurveyArea: SurveyArea | null
  selectedSurveyAreaId: string | null
  filteredEnclosures: FilteredEnclosureItem[]
  enclosureListFilter: EnclosureListFilter
  selectedEnclosure: Enclosure | null
  selectedEnclosureId: string | null
  expandedSavedEnclosureId: string | null
  assignmentEditorEnclosureId: string | null
  assignmentHerdId: string
  assignmentCount: string
  assignmentNotes: string
  assignmentError: string
  isAssignmentSaving: boolean
  endingAssignmentId: string | null
  showSelectedTrack: boolean
  selectedTrackSummary: WalkTrackSummary
  safeHerds: Herd[]
  herdsById: Map<string, Herd>
  animalsByHerdId: Map<string, Animal[]>
  assignmentHistoryByEnclosureId: Map<string, EnclosureAssignment[]>
  editingEnclosureId: string | null
  editName: string
  editNotes: string
  editError: string
  isEditing: boolean
  editGeometryPointsLength: number
  editAreaM2: number
  selectedEditPointIndex: number | null
  isAddingEditPoint: boolean
  onFocusSurveyArea: (surveyArea: SurveyArea) => void
  onEnclosureListFilterChange: (filter: EnclosureListFilter) => void
  onExpandedSavedEnclosureChange: (enclosureId: string) => void
  onFocusEnclosure: (enclosure: Enclosure) => void
  onStartEditEnclosure: (enclosure: Enclosure) => void
  onToggleShowSelectedTrack: (enclosureId: string) => void
  onDeleteEnclosure: (enclosure: Enclosure) => void
  onOpenAssignmentEditor: (enclosure: Enclosure) => void
  onCancelAssignmentEditor: () => void
  onAssignHerdToEnclosure: (enclosure: Enclosure) => void
  onAssignmentHerdIdChange: (nextHerdId: string) => void
  onAssignmentCountChange: (value: string) => void
  onAssignmentNotesChange: (value: string) => void
  onEndEnclosureAssignment: (assignment: EnclosureAssignment) => void
  onEditNameChange: (value: string) => void
  onEditNotesChange: (value: string) => void
  onStartAddEditPoint: () => void
  onRemoveSelectedEditPoint: () => void
  onSaveEditedEnclosure: (event: FormEvent<HTMLFormElement>) => void
  onCancelEditEnclosure: () => void
}

export function LivePositionSidebarPanel({
  mobilePanel,
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
  onFocusSurveyArea,
  onEnclosureListFilterChange,
  onExpandedSavedEnclosureChange,
  onFocusEnclosure,
  onStartEditEnclosure,
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
}: LivePositionSidebarPanelProps) {
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
      <div className="mt-4 rounded-2xl border border-[#d2cbc0] bg-[#efe4c8] px-4 py-3 text-sm text-[#17130f]">
        Fokus: <span className="font-medium">{selectedEnclosure.name}</span>. Auf ein Polygon in der Karte tippen, um die Bearbeitung direkt zu öffnen.
      </div>
    )
  }

  function renderEnclosureListContent() {
    if (filteredEnclosures.length === 0) {
      return (
        <p className="mt-3 text-sm text-neutral-600">
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

  const sidebarContent = (
    <>
      {renderSurveyAreasPanel()}

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Gespeicherte Pferche</h2>
        <span className="text-sm text-neutral-500">{filteredEnclosures.length}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {enclosureFilterOptions.map((filterOption) => (
          <button
            key={filterOption.id}
            type="button"
            onClick={() => onEnclosureListFilterChange(filterOption.id)}
            className={[
              'rounded-2xl px-3 py-3 text-sm font-medium',
              enclosureListFilter === filterOption.id
                ? 'border border-[#5a5347] bg-[#f1efeb] text-[#17130f]'
                : 'bg-[#f1efeb] text-neutral-950',
            ].join(' ')}
          >
            {filterOption.label}
          </button>
        ))}
      </div>

      {renderSelectedEnclosureNotice()}
      {renderEnclosureListContent()}
    </>
  )

  return (
    <>
      <div
        className={[
          'rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)] lg:hidden',
          mobilePanel === 'saved' ? 'block' : 'hidden',
        ].join(' ')}
      >
        {sidebarContent}
      </div>

      <section className="hidden h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)] lg:flex">
        <div className="min-w-0 border-b border-[#ccb98a] pb-4">
          <h2 className="text-lg font-semibold text-neutral-950">Pferche & Flächen</h2>
          <p className="mt-1 text-sm text-neutral-700">
            {safeSurveyAreas.length} Flächen · {filteredEnclosures.length} Pferche
          </p>
        </div>

        <div className="mt-4 min-h-0 flex flex-1 flex-col">
          <div className="shrink-0">
            {renderSurveyAreasPanel()}

            <div className="mt-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-neutral-950">Gespeicherte Pferche</h3>
              <span className="text-sm text-neutral-500">{filteredEnclosures.length}</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {enclosureFilterOptions.map((filterOption) => (
                <button
                  key={filterOption.id}
                  type="button"
                  onClick={() => onEnclosureListFilterChange(filterOption.id)}
                  className={[
                    'rounded-2xl px-3 py-3 text-sm font-medium',
                    enclosureListFilter === filterOption.id
                      ? 'border border-[#5a5347] bg-[#f1efeb] text-[#17130f]'
                      : 'bg-[#f1efeb] text-neutral-950',
                  ].join(' ')}
                >
                  {filterOption.label}
                </button>
              ))}
            </div>

            {renderSelectedEnclosureNotice()}
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
            {renderEnclosureListContent()}
          </div>
        </div>
      </section>
    </>
  )
}
