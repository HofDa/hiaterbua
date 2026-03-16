'use client'

import { useState, type FormEvent, type Ref } from 'react'
import { LivePositionMapDesktopDrawOverlay } from '@/components/maps/live-position-map-desktop-draw-overlay'
import { LivePositionMapEditOverlay } from '@/components/maps/live-position-map-edit-overlay'
import { LivePositionMapMobileDrawToolbar } from '@/components/maps/live-position-map-mobile-draw-toolbar'
import { LivePositionMapMobileWalkToolbar } from '@/components/maps/live-position-map-mobile-walk-toolbar'
import { LivePositionMapTopControls } from '@/components/maps/live-position-map-top-controls'
import { ControlsIcon } from '@/components/maps/map-toolbar-icons'
import type {
  MobilePanel,
  PositionData,
} from '@/components/maps/live-position-map-types'
import type { MapBaseLayer } from '@/types/domain'

export type LivePositionMapCanvasPanelProps = {
  containerRef: Ref<HTMLDivElement>
  mobilePanel: MobilePanel
  editingEnclosureId: string | null
  position: PositionData | null
  isBaseLayerMenuOpen: boolean
  baseLayer: MapBaseLayer
  showSurveyAreas: boolean
  prefetchingMapArea: boolean
  prefetchStatus: string
  isDrawing: boolean
  isWalking: boolean
  draftPointsLength: number
  draftAreaM2: number
  name: string
  notes: string
  saveError: string
  isSaving: boolean
  walkPoints: PositionData[]
  walkPointsLength: number
  walkAreaM2: number
  walkName: string
  walkNotes: string
  walkError: string
  isWalkSaving: boolean
  isWalkPointsOpen: boolean
  selectedWalkPointIndex: number | null
  selectedWalkPoint: PositionData | null
  editGeometryPointsLength: number
  selectedEditPointIndex: number | null
  isAddingEditPoint: boolean
  isEditing: boolean
  onCenterMap: () => void
  onToggleBaseLayerMenu: () => void
  onUpdateBaseLayer: (nextBaseLayer: MapBaseLayer) => void | Promise<void>
  onToggleShowSurveyAreas: () => void
  onPrefetchVisibleMapArea: () => void | Promise<void>
  onResizeMap?: () => void
  onStartDrawing: () => void
  onFinishDrawing: () => void
  onUndoLastPoint: () => void
  onClearDraft: () => void
  onNameChange: (value: string) => void
  onNotesChange: (value: string) => void
  onSaveEnclosure: (event: FormEvent<HTMLFormElement>) => void
  onMobilePanelChange: (panel: MobilePanel) => void
  onToggleWalkPoints: () => void
  onSelectedWalkPointIndexChange: (index: number | null) => void
  onStartWalkMode: () => void | Promise<void>
  onStopWalkMode: () => void
  onUndoLastWalkPoint: () => void | Promise<void>
  onRemoveWalkPointAtIndex: (index: number) => void | Promise<void>
  onDiscardWalkMode: () => void | Promise<void>
  onWalkNameChange: (value: string) => void
  onWalkNotesChange: (value: string) => void
  onSaveWalkEnclosure: (event: FormEvent<HTMLFormElement>) => void
  onStartAddEditPoint: () => void
  onRemoveSelectedEditPoint: () => void
  onPersistEditedEnclosure: () => void | Promise<void>
  onCancelEditEnclosure: () => void
}

export function LivePositionMapCanvasPanel({
  containerRef,
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
  isAddingEditPoint,
  isEditing,
  selectedEditPointIndex,
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
}: LivePositionMapCanvasPanelProps) {
  const [isMobileControlsOpen, setIsMobileControlsOpen] = useState(false)
  const [isDesktopToolbarOpen, setIsDesktopToolbarOpen] = useState(false)

  const hasMobileToolbar =
    !editingEnclosureId && (mobilePanel === 'draw' || mobilePanel === 'walk')

  return (
    <div className="relative overflow-hidden rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] shadow-[0_18px_40px_rgba(23,20,18,0.08)]">
      <div
        ref={containerRef}
        className="h-[420px] w-full bg-[#fffdf6] sm:h-[520px] lg:h-[calc(100vh-8rem)]"
      />
      {hasMobileToolbar ? (
        <button
          type="button"
          aria-label={isMobileControlsOpen ? 'Werkzeuge ausblenden' : 'Werkzeuge einblenden'}
          aria-expanded={isMobileControlsOpen}
          onClick={() => setIsMobileControlsOpen((current) => !current)}
          className={[
            'absolute left-2 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-[#ccb98a] bg-[#fffdf6] text-neutral-950 shadow-lg transition-all lg:hidden',
            isMobileControlsOpen ? 'bottom-[5.5rem]' : 'bottom-2',
          ].join(' ')}
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
        className={[
          'pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden p-3 lg:block xl:p-4',
          isDesktopToolbarOpen ? 'opacity-100' : 'opacity-0',
          'transition-opacity duration-200',
        ].join(' ')}
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
        <LivePositionMapTopControls
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
              className={[
                'hidden h-11 w-11 items-center justify-center rounded-full border border-[#ccb98a] bg-[#fffdf6] shadow-lg transition-colors lg:flex',
                isDesktopToolbarOpen ? 'text-neutral-950' : 'text-neutral-600',
              ].join(' ')}
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
        <LivePositionMapTopControls
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
