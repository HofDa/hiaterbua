'use client'

import { LivePositionDrawWorkspace } from '@/components/maps/live-position-draw-workspace'
import { LivePositionSavedEnclosuresMobilePanel } from '@/components/maps/live-position-saved-enclosures-mobile-panel'
import { LivePositionWalkWorkspace } from '@/components/maps/live-position-walk-workspace'
import {
  MobileMapSectionCard,
  MobileMapSegmentButton,
  MobileMapSegmentedControl,
} from '@/components/maps/mobile-map-ui'
import { useLivePositionMapStore } from '@/components/maps/hooks/use-live-position-map-store'
import type { MobilePanel } from '@/components/maps/live-position-map-types'

export type LivePositionWorkflowPanelsProps = {
  onMobilePanelChange: (panel: MobilePanel) => void
}

export function LivePositionWorkflowPanels({
  onMobilePanelChange,
}: LivePositionWorkflowPanelsProps) {
  const {
    mobilePanel,
    isDrawing,
    draftPointsCount,
    draftAreaM2,
    name,
    notes,
    saveError,
    isSaving,
    isWalking,
    walkPoints,
    walkAreaM2,
    walkName,
    walkNotes,
    walkError,
    isWalkSaving,
    isWalkPointsOpen,
    selectedWalkPointIndex,
    selectedWalkPoint,
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
  } = useLivePositionMapStore((state) => state.workflow)
  const {
    onStartDrawing,
    onFinishDrawing,
    onUndoLastPoint,
    onClearDraft,
    onNameChange,
    onNotesChange,
    onSaveEnclosure,
    onToggleWalkPoints,
    onSelectedWalkPointIndexChange,
    onStartWalkMode,
    onStopWalkMode,
    onUndoLastWalkPoint,
    onRemoveWalkPointAtIndex,
    onDiscardWalkMode,
    onWalkNameChange,
    onWalkNotesChange,
    onSaveWalkEnclosure,
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
  } = useLivePositionMapStore((state) => state.workflowHandles)

  return (
    <>
      <MobileMapSegmentedControl>
        <MobileMapSegmentButton
          onClick={() => onMobilePanelChange('saved')}
          active={mobilePanel === 'saved'}
        >
          Pferche
        </MobileMapSegmentButton>
        <MobileMapSegmentButton
          onClick={() => onMobilePanelChange('walk')}
          active={mobilePanel === 'walk'}
        >
          Walk
        </MobileMapSegmentButton>
        <MobileMapSegmentButton
          onClick={() => onMobilePanelChange('draw')}
          active={mobilePanel === 'draw'}
        >
          Zeichnen
        </MobileMapSegmentButton>
      </MobileMapSegmentedControl>

      <div className={mobilePanel === 'draw' ? 'lg:hidden' : 'hidden'}>
        <MobileMapSectionCard>
          <h2 className="text-lg font-semibold">Pferch zeichnen</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Die Zeichenwerkzeuge liegen direkt auf der Karte. Name und Notiz werden hier ergänzt.
          </p>
          <LivePositionDrawWorkspace
            isDrawing={isDrawing}
            isWalking={isWalking}
            draftPointsCount={draftPointsCount}
            draftAreaM2={draftAreaM2}
            name={name}
            notes={notes}
            saveError={saveError}
            isSaving={isSaving}
            showControls={false}
            showStatusText={false}
            onStartDrawing={onStartDrawing}
            onFinishDrawing={onFinishDrawing}
            onUndoLastPoint={onUndoLastPoint}
            onClearDraft={onClearDraft}
            onNameChange={onNameChange}
            onNotesChange={onNotesChange}
            onSubmit={onSaveEnclosure}
          />
        </MobileMapSectionCard>
      </div>

      <div className={mobilePanel === 'walk' ? 'lg:hidden' : 'hidden'}>
        <MobileMapSectionCard>
          <h2 className="text-lg font-semibold">Pferch per GPS erfassen</h2>
          <LivePositionWalkWorkspace
            isDrawing={isDrawing}
            isWalking={isWalking}
            walkPoints={walkPoints}
            walkAreaM2={walkAreaM2}
            walkName={walkName}
            walkNotes={walkNotes}
            walkError={walkError}
            isWalkSaving={isWalkSaving}
            isWalkPointsOpen={isWalkPointsOpen}
            selectedWalkPointIndex={selectedWalkPointIndex}
            selectedWalkPoint={selectedWalkPoint}
            showControls
            showStatusText
            showHint={false}
            onToggleWalkPoints={onToggleWalkPoints}
            onSelectedWalkPointIndexChange={onSelectedWalkPointIndexChange}
            onStartWalkMode={onStartWalkMode}
            onStopWalkMode={onStopWalkMode}
            onUndoLastWalkPoint={onUndoLastWalkPoint}
            onRemoveWalkPointAtIndex={onRemoveWalkPointAtIndex}
            onDiscardWalkMode={onDiscardWalkMode}
            onWalkNameChange={onWalkNameChange}
            onWalkNotesChange={onWalkNotesChange}
            onSubmit={onSaveWalkEnclosure}
          />
        </MobileMapSectionCard>
      </div>

      <div className={mobilePanel === 'saved' ? 'lg:hidden' : 'hidden'}>
        <LivePositionSavedEnclosuresMobilePanel
          filteredEnclosures={filteredEnclosures}
          selectedEnclosure={selectedEnclosure}
          selectedEnclosureId={selectedEnclosureId}
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
          activeAssignmentsByHerdId={activeAssignmentsByHerdId}
          isSelectedEnclosureInfoOpen={isSelectedEnclosureInfoOpen}
          showSelectedTrack={showSelectedTrack}
          onSelectedEnclosureChange={onSelectedEnclosureChange}
          onToggleSelectedEnclosureInfo={onToggleSelectedEnclosureInfo}
          onToggleShowSelectedTrack={onToggleShowSelectedTrack}
          onOpenAssignmentEditor={onOpenAssignmentEditor}
          onCancelAssignmentEditor={onCancelAssignmentEditor}
          onAssignHerdToEnclosure={onAssignHerdToEnclosure}
          onAssignmentHerdIdChange={onAssignmentHerdIdChange}
          onAssignmentCountChange={onAssignmentCountChange}
          onAssignmentNotesChange={onAssignmentNotesChange}
          onEndEnclosureAssignment={onEndEnclosureAssignment}
        />
      </div>
    </>
  )
}
