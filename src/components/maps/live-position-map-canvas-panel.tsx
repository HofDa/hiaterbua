'use client'

import { useState, type Ref } from 'react'
import { LivePositionMapDesktopDrawOverlay } from '@/components/maps/live-position-map-desktop-draw-overlay'
import { LivePositionMapEditOverlay } from '@/components/maps/live-position-map-edit-overlay'
import { LivePositionMapMobileDrawToolbar } from '@/components/maps/live-position-map-mobile-draw-toolbar'
import { LivePositionMapMobileWalkToolbar } from '@/components/maps/live-position-map-mobile-walk-toolbar'
import { MapTopControls } from '@/components/maps/map-top-controls'
import { ControlsIcon } from '@/components/maps/map-toolbar-icons'
import { useLivePositionMapStore } from '@/components/maps/hooks/use-live-position-map-store'
import { cn } from '@/lib/utils/cn'

export type LivePositionMapCanvasPanelProps = {
  containerRef: Ref<HTMLDivElement>
  /** When true, drop the panel chrome so an outer wrapper can own it (cohesive Karte card). */
  embedded?: boolean
}

export function LivePositionMapCanvasPanel({
  containerRef,
  embedded = false,
}: LivePositionMapCanvasPanelProps) {
  const {
    mobilePanel,
    editingEnclosureId,
    position,
    isBaseLayerMenuOpen,
    baseLayer,
    showSurveyAreas,
    prefetchingMapArea,
    prefetchStatus,
    isDrawing,
    isWalking,
    draftPointsLength,
    draftAreaM2,
    name,
    notes,
    saveError,
    isSaving,
    walkPoints,
    walkPointsLength,
    walkAreaM2,
    walkName,
    walkNotes,
    walkError,
    isWalkSaving,
    isWalkPointsOpen,
    selectedWalkPointIndex,
    selectedWalkPoint,
    editGeometryPointsLength,
    selectedEditPointIndex,
    isAddingEditPoint,
    isEditing,
  } = useLivePositionMapStore((state) => state.canvas)
  const {
    onCenterMap,
    onToggleBaseLayerMenu,
    onUpdateBaseLayer,
    onToggleShowSurveyAreas,
    onPrefetchVisibleMapArea,
    onStartDrawing,
    onFinishDrawing,
    onUndoLastPoint,
    onClearDraft,
    onNameChange,
    onNotesChange,
    onSaveEnclosure,
    onMobilePanelChange,
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
    onStartAddEditPoint,
    onRemoveSelectedEditPoint,
    onPersistEditedEnclosure,
    onCancelEditEnclosure,
  } = useLivePositionMapStore((state) => state.canvasHandles)

  const [isMobileControlsOpen, setIsMobileControlsOpen] = useState(false)
  const [isDesktopToolbarOpen, setIsDesktopToolbarOpen] = useState(false)

  const hasMobileToolbar =
    !editingEnclosureId && (mobilePanel === 'draw' || mobilePanel === 'walk')

  return (
    <div className={cn('relative overflow-hidden', !embedded && 'app-panel')}>
      <div
        ref={containerRef}
        className="h-[420px] w-full bg-surface-raised sm:h-[520px] lg:h-[calc(100vh-8rem)]"
      />
      {hasMobileToolbar ? (
        <button
          type="button"
          aria-label={isMobileControlsOpen ? 'Werkzeuge ausblenden' : 'Werkzeuge einblenden'}
          aria-expanded={isMobileControlsOpen}
          onClick={() => setIsMobileControlsOpen((current) => !current)}
          className={cn(
            'absolute left-2 z-30 flex items-center justify-center app-map-icon-button text-ink-strong transition-all lg:hidden',
            isMobileControlsOpen ? 'bottom-[5.5rem]' : 'bottom-2',
          )}
        >
          <ControlsIcon />
        </button>
      ) : null}
      {mobilePanel === 'draw' && !editingEnclosureId && isMobileControlsOpen ? (
        <LivePositionMapMobileDrawToolbar
          draftPointsLength={draftPointsLength}
          draftAreaM2={draftAreaM2}
          isDrawing={isDrawing}
          isWalking={isWalking}
          onStartDrawing={onStartDrawing}
          onFinishDrawing={onFinishDrawing}
          onUndoLastPoint={onUndoLastPoint}
          onClearDraft={onClearDraft}
        />
      ) : null}
      {mobilePanel === 'walk' && !editingEnclosureId && isMobileControlsOpen ? (
        <LivePositionMapMobileWalkToolbar
          walkPointsLength={walkPointsLength}
          walkAreaM2={walkAreaM2}
          isWalking={isWalking}
          isDrawing={isDrawing}
          onStartWalkMode={onStartWalkMode}
          onStopWalkMode={onStopWalkMode}
          onUndoLastWalkPoint={onUndoLastWalkPoint}
          onDiscardWalkMode={onDiscardWalkMode}
        />
      ) : null}
      <div
        aria-hidden={!isDesktopToolbarOpen}
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden p-3 transition-opacity duration-200 lg:block xl:p-4',
          isDesktopToolbarOpen ? 'opacity-100' : 'opacity-0',
        )}
      >
        {isDesktopToolbarOpen ? (
          <LivePositionMapDesktopDrawOverlay
            mobilePanel={mobilePanel}
            draftPointsLength={draftPointsLength}
            draftAreaM2={draftAreaM2}
            isDrawing={isDrawing}
            name={name}
            notes={notes}
            saveError={saveError}
            isSaving={isSaving}
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
            onModeChange={onMobilePanelChange}
            onStartDrawing={onStartDrawing}
            onFinishDrawing={onFinishDrawing}
            onUndoLastPoint={onUndoLastPoint}
            onClearDraft={onClearDraft}
            onNameChange={onNameChange}
            onNotesChange={onNotesChange}
            onSaveEnclosure={onSaveEnclosure}
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
        ) : null}
      </div>
      <div className="hidden lg:block">
        <MapTopControls
          positionAvailable={Boolean(position)}
          isBaseLayerMenuOpen={isBaseLayerMenuOpen}
          baseLayer={baseLayer}
          showSurveyAreas={showSurveyAreas}
          prefetchingMapArea={prefetchingMapArea}
          prefetchStatus={prefetchStatus}
          onCenterMap={onCenterMap}
          onToggleBaseLayerMenu={onToggleBaseLayerMenu}
          onUpdateBaseLayer={onUpdateBaseLayer}
          onToggleShowSurveyAreas={onToggleShowSurveyAreas}
          onPrefetchVisibleMapArea={onPrefetchVisibleMapArea}
          extraControls={
            <button
              type="button"
              aria-label={
                isDesktopToolbarOpen ? 'Werkzeugleiste ausblenden' : 'Werkzeugleiste einblenden'
              }
              aria-expanded={isDesktopToolbarOpen}
              onClick={() => setIsDesktopToolbarOpen((current) => !current)}
              className={cn(
                'hidden items-center justify-center app-map-icon-button transition-colors lg:flex',
                isDesktopToolbarOpen ? 'text-ink-strong' : 'text-ink-muted',
              )}
              title={
                isDesktopToolbarOpen ? 'Werkzeugleiste ausblenden' : 'Werkzeugleiste einblenden'
              }
            >
              <ControlsIcon />
            </button>
          }
        />
      </div>
      <div className="lg:hidden">
        <MapTopControls
          positionAvailable={Boolean(position)}
          isBaseLayerMenuOpen={isBaseLayerMenuOpen}
          baseLayer={baseLayer}
          showSurveyAreas={showSurveyAreas}
          prefetchingMapArea={prefetchingMapArea}
          prefetchStatus={prefetchStatus}
          onCenterMap={onCenterMap}
          onToggleBaseLayerMenu={onToggleBaseLayerMenu}
          onUpdateBaseLayer={onUpdateBaseLayer}
          onToggleShowSurveyAreas={onToggleShowSurveyAreas}
          onPrefetchVisibleMapArea={onPrefetchVisibleMapArea}
        />
      </div>
      {editingEnclosureId ? (
        <LivePositionMapEditOverlay
          editGeometryPointsLength={editGeometryPointsLength}
          selectedEditPointIndex={selectedEditPointIndex}
          isAddingEditPoint={isAddingEditPoint}
          isEditing={isEditing}
          onStartAddEditPoint={onStartAddEditPoint}
          onRemoveSelectedEditPoint={onRemoveSelectedEditPoint}
          onPersistEditedEnclosure={onPersistEditedEnclosure}
          onCancelEditEnclosure={onCancelEditEnclosure}
        />
      ) : null}
    </div>
  )
}
