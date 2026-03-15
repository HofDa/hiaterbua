'use client'

import type { FormEvent } from 'react'
import type {
  FilteredEnclosureItem,
} from '@/lib/maps/live-position-map-helpers'
import { LivePositionDrawWorkspace } from '@/components/maps/live-position-draw-workspace'
import {
  MobilePanel,
  PositionData,
} from '@/components/maps/live-position-map-types'
import { LivePositionSavedEnclosuresMobilePanel } from '@/components/maps/live-position-saved-enclosures-mobile-panel'
import { LivePositionWalkWorkspace } from '@/components/maps/live-position-walk-workspace'
import {
  MobileMapSectionCard,
  MobileMapSegmentButton,
  MobileMapSegmentedControl,
} from '@/components/maps/mobile-map-ui'
import type { Enclosure } from '@/types/domain'

export type LivePositionWorkflowPanelsProps = {
  mobilePanel: MobilePanel
  isDrawing: boolean
  draftPointsCount: number
  draftAreaM2: number
  name: string
  notes: string
  saveError: string
  isSaving: boolean
  isWalking: boolean
  walkPoints: PositionData[]
  walkAreaM2: number
  walkName: string
  walkNotes: string
  walkError: string
  isWalkSaving: boolean
  isWalkPointsOpen: boolean
  selectedWalkPointIndex: number | null
  selectedWalkPoint: PositionData | null
  filteredEnclosures: FilteredEnclosureItem[]
  selectedEnclosure: Enclosure | null
  selectedEnclosureId: string | null
  isSelectedEnclosureInfoOpen: boolean
  showSelectedTrack: boolean
  onMobilePanelChange: (panel: MobilePanel) => void
  onStartDrawing: () => void
  onFinishDrawing: () => void
  onUndoLastPoint: () => void
  onClearDraft: () => void
  onNameChange: (value: string) => void
  onNotesChange: (value: string) => void
  onSaveEnclosure: (event: FormEvent<HTMLFormElement>) => void
  onToggleWalkPoints: () => void
  onSelectedWalkPointIndexChange: (index: number | null) => void
  onStartWalkMode: () => void
  onStopWalkMode: () => void
  onUndoLastWalkPoint: () => void
  onRemoveWalkPointAtIndex: (index: number) => void
  onDiscardWalkMode: () => void
  onWalkNameChange: (value: string) => void
  onWalkNotesChange: (value: string) => void
  onSaveWalkEnclosure: (event: FormEvent<HTMLFormElement>) => void
  onSelectedEnclosureChange: (nextId: string) => void
  onClearSelectedEnclosure: () => void
  onToggleSelectedEnclosureInfo: () => void
  onToggleShowSelectedTrack: () => void
}

export function LivePositionWorkflowPanels({
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
  isSelectedEnclosureInfoOpen,
  showSelectedTrack,
  onMobilePanelChange,
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
  onClearSelectedEnclosure,
  onToggleSelectedEnclosureInfo,
  onToggleShowSelectedTrack,
}: LivePositionWorkflowPanelsProps) {
  return (
    <>
      <MobileMapSegmentedControl>
        <MobileMapSegmentButton
          onClick={() => onMobilePanelChange('draw')}
          active={mobilePanel === 'draw'}
        >
          Zeichnen
        </MobileMapSegmentButton>
        <MobileMapSegmentButton
          onClick={() => onMobilePanelChange('walk')}
          active={mobilePanel === 'walk'}
        >
          Walk
        </MobileMapSegmentButton>
        <MobileMapSegmentButton
          onClick={() => onMobilePanelChange('saved')}
          active={mobilePanel === 'saved'}
        >
          Pferche
        </MobileMapSegmentButton>
      </MobileMapSegmentedControl>

      <div className={mobilePanel === 'draw' ? 'lg:hidden' : 'hidden'}>
        <MobileMapSectionCard>
          <h2 className="text-lg font-semibold">Pferch zeichnen</h2>
          <p className="mt-2 text-sm text-neutral-700">
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
          isSelectedEnclosureInfoOpen={isSelectedEnclosureInfoOpen}
          showSelectedTrack={showSelectedTrack}
          onSelectedEnclosureChange={onSelectedEnclosureChange}
          onClearSelection={onClearSelectedEnclosure}
          onToggleSelectedEnclosureInfo={onToggleSelectedEnclosureInfo}
          onToggleShowSelectedTrack={onToggleShowSelectedTrack}
        />
      </div>
    </>
  )
}
