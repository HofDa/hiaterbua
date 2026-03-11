'use client'

import type { FormEvent } from 'react'
import { formatArea } from '@/lib/maps/map-core'
import {
  type FilteredEnclosureItem,
  type WalkTrackSummary,
} from '@/lib/maps/live-position-map-helpers'
import { LivePositionEnclosureAssignmentPanel } from '@/components/maps/live-position-enclosure-assignment-panel'
import { LivePositionEnclosureEditForm } from '@/components/maps/live-position-enclosure-edit-form'
import {
  LivePositionSavedEnclosureActionsSection,
  LivePositionSavedEnclosureStatsSection,
  LivePositionSavedEnclosureTrackSummarySection,
} from '@/components/maps/live-position-saved-enclosure-card-sections'
import type {
  Animal,
  Enclosure,
  EnclosureAssignment,
  Herd,
} from '@/types/domain'

type LivePositionSavedEnclosureCardProps = {
  item: FilteredEnclosureItem
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

export function LivePositionSavedEnclosureCard({
  item,
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
}: LivePositionSavedEnclosureCardProps) {
  const { enclosure, stats: enclosureStats, activeAssignment } = item
  const isExpanded = expandedSavedEnclosureId === enclosure.id
  const isSelected = selectedEnclosureId === enclosure.id

  return (
    <div
      className={[
        'min-w-0 overflow-hidden rounded-2xl px-4 py-3',
        isSelected ? 'bg-[#efe4c8]' : 'bg-neutral-50',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => onExpandedSavedEnclosureChange(enclosure.id)}
        aria-expanded={isExpanded}
        className="flex w-full min-w-0 items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <div className="font-medium text-neutral-900">{enclosure.name}</div>
          <div className="mt-1 text-sm text-neutral-600">
            {formatArea(enclosure.areaM2)} · {enclosure.pointsCount ?? 0} Punkte
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xs text-neutral-500">
            {new Date(enclosure.updatedAt).toLocaleDateString('de-DE')}
          </div>
          <div className="mt-1 text-base text-neutral-900">{isExpanded ? '−' : '+'}</div>
        </div>
      </button>

      {isExpanded && enclosure.notes ? (
        <p className="mt-2 text-sm text-neutral-600">{enclosure.notes}</p>
      ) : null}

      {isExpanded ? (
        <div className="mt-3 min-w-0 space-y-3">
          <LivePositionSavedEnclosureStatsSection stats={enclosureStats} />

          <LivePositionEnclosureAssignmentPanel
            enclosure={enclosure}
            activeAssignment={activeAssignment ?? null}
            assignmentEditorEnclosureId={assignmentEditorEnclosureId}
            assignmentHerdId={assignmentHerdId}
            assignmentCount={assignmentCount}
            assignmentNotes={assignmentNotes}
            assignmentError={assignmentError}
            isAssignmentSaving={isAssignmentSaving}
            endingAssignmentId={endingAssignmentId}
            safeHerds={safeHerds}
            herdsById={herdsById}
            animalsByHerdId={animalsByHerdId}
            assignmentHistoryByEnclosureId={assignmentHistoryByEnclosureId}
            onOpenAssignmentEditor={onOpenAssignmentEditor}
            onCancelAssignmentEditor={onCancelAssignmentEditor}
            onAssignHerdToEnclosure={onAssignHerdToEnclosure}
            onAssignmentHerdIdChange={onAssignmentHerdIdChange}
            onAssignmentCountChange={onAssignmentCountChange}
            onAssignmentNotesChange={onAssignmentNotesChange}
            onEndEnclosureAssignment={onEndEnclosureAssignment}
          />

          {isSelected && enclosure.method === 'walk' ? (
            <LivePositionSavedEnclosureTrackSummarySection
              selectedTrackSummary={selectedTrackSummary}
            />
          ) : null}

          <LivePositionSavedEnclosureActionsSection
            enclosure={enclosure}
            isSelected={isSelected}
            showSelectedTrack={showSelectedTrack}
            onFocusEnclosure={onFocusEnclosure}
            onStartEditEnclosure={onStartEditEnclosure}
            onToggleShowSelectedTrack={onToggleShowSelectedTrack}
            onDeleteEnclosure={onDeleteEnclosure}
          />

          {editingEnclosureId === enclosure.id ? (
            <LivePositionEnclosureEditForm
              editName={editName}
              editNotes={editNotes}
              editError={editError}
              isEditing={isEditing}
              editGeometryPointsLength={editGeometryPointsLength}
              editAreaM2={editAreaM2}
              selectedEditPointIndex={selectedEditPointIndex}
              isAddingEditPoint={isAddingEditPoint}
              onEditNameChange={onEditNameChange}
              onEditNotesChange={onEditNotesChange}
              onStartAddEditPoint={onStartAddEditPoint}
              onRemoveSelectedEditPoint={onRemoveSelectedEditPoint}
              onSaveEditedEnclosure={onSaveEditedEnclosure}
              onCancelEditEnclosure={onCancelEditEnclosure}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
