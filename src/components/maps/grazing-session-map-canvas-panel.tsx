'use client'

import { useState, type Ref } from 'react'
import { formatDistance, formatDuration } from '@/lib/maps/grazing-session-map-helpers'
import { GrazingSessionMapDesktopManagementOverlay } from '@/components/maps/grazing-session-map-desktop-management-overlay'
import {
  ControlsIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  TrackpointsIcon,
} from '@/components/maps/map-toolbar-icons'
import { MapMenuToggleButton, MapTopControls } from '@/components/maps/map-top-controls'
import { MapEditActionOverlay } from '@/components/maps/map-edit-action-overlay'
import {
  MobileMapToolbar,
  MobileMapToolbarButton,
  MobileMapToolbarStat,
} from '@/components/maps/mobile-map-toolbar'
import { useGrazingSessionMapStore } from '@/components/maps/hooks/use-grazing-session-map-store'
import { cn } from '@/lib/utils/cn'

export type GrazingSessionMapCanvasPanelProps = {
  containerRef: Ref<HTMLDivElement>
  /** When true, drop the panel chrome so an outer wrapper can own it (cohesive Karte card). */
  embedded?: boolean
}

export function GrazingSessionMapCanvasPanel({
  containerRef,
  embedded = false,
}: GrazingSessionMapCanvasPanelProps) {
  const {
    editingSessionId,
    safeCurrentTrackpointsLength,
    currentDistanceM,
    currentDurationS,
    safeHerds,
    selectedHerdId,
    selectedAnimalCount,
    sessionNotes,
    currentSessionStatus,
    isSaving,
    isEventSaving,
    hasHerds,
    eventNote,
    eventStatus,
    actionError,
    currentMetrics,
    safeCurrentSessionEvents,
    position,
    isBaseLayerMenuOpen,
    baseLayer,
    showSurveyAreas,
    showSessionEventsOnMap,
    prefetchingMapArea,
    prefetchStatus,
    isAddingEditTrackpoint,
    selectedEditTrackpointIndex,
    editTrackpointsLength,
  } = useGrazingSessionMapStore((state) => state.canvas)
  const {
    onSelectedHerdIdChange,
    onAdjustAnimalCount,
    onSessionNotesChange,
    onStartOrResumeSession,
    onPauseSession,
    onResumeSession,
    onStopSession,
    onEventNoteChange,
    onAddSessionMarkerEvent,
    onCenterMap,
    onToggleBaseLayerMenu,
    onUpdateBaseLayer,
    onToggleShowSurveyAreas,
    onToggleShowSessionEventsOnMap,
    onPrefetchVisibleMapArea,
    onStartAddEditTrackpoint,
    onRemoveSelectedEditTrackpoint,
    onSaveEditedSession,
    onCancelEditSession,
  } = useGrazingSessionMapStore((state) => state.canvasHandles)
  const [isMobileControlsOpen, setIsMobileControlsOpen] = useState(true)
  const [isDesktopToolbarOpen, setIsDesktopToolbarOpen] = useState(false)

  const hasMobileToolbar = !editingSessionId
  const managementOverlay = !editingSessionId ? (
    <GrazingSessionMapDesktopManagementOverlay
      safeHerds={safeHerds}
      selectedHerdId={selectedHerdId}
      selectedAnimalCount={selectedAnimalCount}
      sessionNotes={sessionNotes}
      currentSessionStatus={currentSessionStatus}
      isSaving={isSaving}
      isEventSaving={isEventSaving}
      eventNote={eventNote}
      eventStatus={eventStatus}
      actionError={actionError}
      safeCurrentTrackpointsLength={safeCurrentTrackpointsLength}
      currentMetrics={currentMetrics}
      safeCurrentSessionEvents={safeCurrentSessionEvents}
      onSelectedHerdIdChange={onSelectedHerdIdChange}
      onAdjustAnimalCount={onAdjustAnimalCount}
      onSessionNotesChange={onSessionNotesChange}
      onStartSession={onStartOrResumeSession}
      onPauseSession={onPauseSession}
      onResumeSession={onResumeSession}
      onStopSession={onStopSession}
      onEventNoteChange={onEventNoteChange}
      onAddSessionMarkerEvent={onAddSessionMarkerEvent}
    />
  ) : null
  const mapTopControls = (
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
      extraMenuItems={
        <MapMenuToggleButton
          active={showSessionEventsOnMap}
          onClick={onToggleShowSessionEventsOnMap}
          className="mt-1.5"
        >
          Ereignisse {showSessionEventsOnMap ? 'an' : 'aus'}
        </MapMenuToggleButton>
      }
    />
  )

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        !embedded && 'app-panel lg:sticky lg:top-4',
      )}
    >
      <div
        ref={containerRef}
        className="h-[420px] w-full bg-surface-raised sm:h-[520px] lg:h-[calc(100vh-8rem)]"
      />
      {hasMobileToolbar ? (
        <button
          type="button"
          aria-label={isMobileControlsOpen ? 'Steuerung ausblenden' : 'Steuerung einblenden'}
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
      {!editingSessionId && isMobileControlsOpen ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-2 lg:hidden">
          <MobileMapToolbar>
            <MobileMapToolbarStat>
              <span className="inline-flex items-center gap-1">
                <TrackpointsIcon />
                <span>
                  {safeCurrentTrackpointsLength} · {formatDistance(currentDistanceM)}
                </span>
              </span>
            </MobileMapToolbarStat>
            <MobileMapToolbarStat>{formatDuration(currentDurationS)}</MobileMapToolbarStat>
            <MobileMapToolbarButton
              aria-label={currentSessionStatus === 'paused' ? 'Fortsetzen' : 'Weidegang starten'}
              title={currentSessionStatus === 'paused' ? 'Fortsetzen' : 'Weidegang starten'}
              onClick={() => void onStartOrResumeSession()}
              disabled={
                isSaving ||
                currentSessionStatus === 'active' ||
                (currentSessionStatus === null && !hasHerds)
              }
              variant="primary"
              label={currentSessionStatus === 'paused' ? 'Weiter' : 'Start'}
            >
              <PlayIcon />
            </MobileMapToolbarButton>
            <MobileMapToolbarButton
              aria-label="Pausieren"
              title="Pausieren"
              onClick={() => void onPauseSession()}
              disabled={isSaving || currentSessionStatus !== 'active'}
              label="Pause"
            >
              <PauseIcon />
            </MobileMapToolbarButton>
            <MobileMapToolbarButton
              aria-label="Weidegang beenden"
              title="Weidegang beenden"
              onClick={() => void onStopSession()}
              disabled={isSaving || (currentSessionStatus !== 'active' && currentSessionStatus !== 'paused')}
              label="Stop"
            >
              <StopIcon />
            </MobileMapToolbarButton>
          </MobileMapToolbar>
        </div>
      ) : null}
      {isDesktopToolbarOpen ? managementOverlay : null}
      <div className="hidden lg:block">{mapTopControls}</div>
      <div className="lg:hidden">{mapTopControls}</div>
      {editingSessionId ? (
        <MapEditActionOverlay
          title="Weidegang bearbeiten"
          pointCount={editTrackpointsLength}
          selectedPointIndex={selectedEditTrackpointIndex}
          isAddingPoint={isAddingEditTrackpoint}
          isSaving={isSaving}
          minPointCount={1}
          saveLabel="Speichern"
          addingMessage="Nächster Tap setzt Punkt."
          selectedPointMessage={(pointNumber) => `Punkt ${pointNumber} aktiv.`}
          idleMessage="Punkt antippen oder Aktion wählen."
          onStartAddPoint={onStartAddEditTrackpoint}
          onRemoveSelectedPoint={onRemoveSelectedEditTrackpoint}
          onSave={onSaveEditedSession}
          onCancel={onCancelEditSession}
        />
      ) : null}
    </div>
  )
}
