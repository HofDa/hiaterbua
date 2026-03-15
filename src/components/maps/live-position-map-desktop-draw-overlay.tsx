'use client'

import {
  MobileMapFloatingCard,
  MobileMapSegmentButton,
} from '@/components/maps/mobile-map-ui'
import { LivePositionMapDesktopDrawMode } from './live-position-map-desktop-draw-overlay/draw-mode'
import { LivePositionMapDesktopWalkMode } from './live-position-map-desktop-draw-overlay/walk-mode'
import type { LivePositionMapDesktopDrawOverlayProps } from './live-position-map-desktop-draw-overlay/types'

export function LivePositionMapDesktopDrawOverlay({
  mobilePanel,
  draftPointsLength,
  draftAreaM2,
  isDrawing,
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
  onModeChange,
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
}: LivePositionMapDesktopDrawOverlayProps) {
  const activeMode = mobilePanel === 'walk' ? 'walk' : 'draw'

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden p-3 lg:block xl:p-4">
      <MobileMapFloatingCard className="bg-[rgba(255,248,234,0.97)] p-3 backdrop-blur-[3px] xl:p-4">
        <div className="grid grid-cols-2 gap-2 border-b border-[#ccb98a] pb-3">
          <MobileMapSegmentButton
            active={activeMode === 'draw'}
            className="text-sm"
            onClick={() => onModeChange('draw')}
          >
            Zeichnen
          </MobileMapSegmentButton>
          <MobileMapSegmentButton
            active={activeMode === 'walk'}
            className="text-sm"
            onClick={() => onModeChange('walk')}
          >
            GPS
          </MobileMapSegmentButton>
        </div>

        {activeMode === 'draw' ? (
          <LivePositionMapDesktopDrawMode
            draftPointsLength={draftPointsLength}
            draftAreaM2={draftAreaM2}
            isDrawing={isDrawing}
            isWalking={isWalking}
            name={name}
            notes={notes}
            saveError={saveError}
            isSaving={isSaving}
            onStartDrawing={onStartDrawing}
            onFinishDrawing={onFinishDrawing}
            onUndoLastPoint={onUndoLastPoint}
            onClearDraft={onClearDraft}
            onNameChange={onNameChange}
            onNotesChange={onNotesChange}
            onSaveEnclosure={onSaveEnclosure}
          />
        ) : (
          <LivePositionMapDesktopWalkMode
            walkPoints={walkPoints}
            walkAreaM2={walkAreaM2}
            isWalking={isWalking}
            isDrawing={isDrawing}
            isWalkPointsOpen={isWalkPointsOpen}
            selectedWalkPointIndex={selectedWalkPointIndex}
            selectedWalkPoint={selectedWalkPoint}
            walkName={walkName}
            walkNotes={walkNotes}
            walkError={walkError}
            isWalkSaving={isWalkSaving}
            onToggleWalkPoints={onToggleWalkPoints}
            onSelectedWalkPointIndexChange={onSelectedWalkPointIndexChange}
            onStartWalkMode={onStartWalkMode}
            onStopWalkMode={onStopWalkMode}
            onUndoLastWalkPoint={onUndoLastWalkPoint}
            onRemoveWalkPointAtIndex={onRemoveWalkPointAtIndex}
            onDiscardWalkMode={onDiscardWalkMode}
            onWalkNameChange={onWalkNameChange}
            onWalkNotesChange={onWalkNotesChange}
            onSaveWalkEnclosure={onSaveWalkEnclosure}
          />
        )}
      </MobileMapFloatingCard>
    </div>
  )
}
