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
import { MapFallbackPanel } from '@/components/maps/map-fallback-panel'
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
    mapReady,
    mapLoadState,
    mapWarning,
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
    onCancelPrefetchVisibleMapArea,
    onStartAddEditTrackpoint,
    onRemoveSelectedEditTrackpoint,
    onSaveEditedSession,
    onCancelEditSession,
  } = useGrazingSessionMapStore((state) => state.canvasHandles)
  const [isMobileControlsOpen, setIsMobileControlsOpen] = useState(true)
  const [isDesktopToolbarOpen, setIsDesktopToolbarOpen] = useState(false)
  const showMapFallback = !mapReady && mapLoadState !== 'loading'
  const sessionStatusLabel =
    currentSessionStatus === 'active'
      ? 'Weidegang läuft'
      : currentSessionStatus === 'paused'
        ? 'Weidegang pausiert'
        : 'kein Weidegang aktiv'

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
      onCancelPrefetchVisibleMapArea={onCancelPrefetchVisibleMapArea}
      mapWarning={mapWarning}
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
      {mapWarning && !showMapFallback ? (
        <div className="pointer-events-none absolute inset-x-2 top-2 z-20 lg:inset-x-3 lg:top-3">
          <div className="mx-auto max-w-md rounded-[1rem] border border-warning-border bg-warning-surface/95 px-3 py-2 text-xs font-semibold text-warning-ink shadow-sm">
            {mapWarning}
          </div>
        </div>
      ) : null}
      {showMapFallback ? (
        <MapFallbackPanel
          title="Karte momentan nicht verfügbar"
          detail="Tiles oder Kartenmodul konnten nicht geladen werden. Weidegang und Ereignisse bleiben lokal nutzbar."
          position={position}
          statusLabel={sessionStatusLabel}
        >
          <button
            type="button"
            onClick={() => void onStartOrResumeSession()}
            disabled={
              isSaving ||
              currentSessionStatus === 'active' ||
              (currentSessionStatus === null && !hasHerds)
            }
            className="min-h-12 rounded-[1rem] border border-border-strong bg-surface-muted px-4 py-3 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {currentSessionStatus === 'paused' ? 'Weiterführen' : 'Starten'}
          </button>
          <button
            type="button"
            onClick={() => void onPauseSession()}
            disabled={isSaving || currentSessionStatus !== 'active'}
            className="min-h-12 rounded-[1rem] border border-border bg-surface-raised px-4 py-3 text-sm font-semibold text-ink disabled:opacity-50"
          >
            Pause
          </button>
          <button
            type="button"
            onClick={() => void onAddSessionMarkerEvent('note', eventNote)}
            disabled={isEventSaving || !currentSessionStatus || !eventNote.trim()}
            className="min-h-12 rounded-[1rem] border border-border bg-surface-raised px-4 py-3 text-sm font-semibold text-ink disabled:opacity-50"
          >
            Notiz speichern
          </button>
          <button
            type="button"
            onClick={() => void onStopSession()}
            disabled={
              isSaving ||
              (currentSessionStatus !== 'active' && currentSessionStatus !== 'paused')
            }
            className="min-h-12 rounded-[1rem] border border-error-border bg-error-surface px-4 py-3 text-sm font-semibold text-error-ink disabled:opacity-50"
          >
            Beenden
          </button>
        </MapFallbackPanel>
      ) : null}
      {hasMobileToolbar ? (
        <button
          type="button"
          aria-label={isMobileControlsOpen ? 'Weidegang ausblenden' : 'Weidegang einblenden'}
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
