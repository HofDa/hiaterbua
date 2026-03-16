'use client'

import { useState, type Ref } from 'react'
import {
  formatDistance,
  formatDuration,
  type SessionMetrics,
} from '@/lib/maps/grazing-session-map-helpers'
import { GrazingSessionMapDesktopManagementOverlay } from '@/components/maps/grazing-session-map-desktop-management-overlay'
import {
  CenterIcon,
  ControlsIcon,
  LayersIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  TrackpointsIcon,
} from '@/components/maps/map-toolbar-icons'
import {
  MobileMapToolbar,
  MobileMapToolbarButton,
  MobileMapToolbarStat,
} from '@/components/maps/mobile-map-toolbar'
import {
  MobileMapFloatingCard,
  MobileMapTopControls,
} from '@/components/maps/mobile-map-ui'
import type { PositionData } from '@/components/maps/grazing-session-map-types'
import type {
  Herd,
  MapBaseLayer,
  SessionEvent,
  SessionEventType,
  SessionStatus,
} from '@/types/domain'

type GrazingSessionMapCanvasPanelProps = {
  containerRef: Ref<HTMLDivElement>
  editingSessionId: string | null
  safeCurrentTrackpointsLength: number
  currentDistanceM: number
  currentDurationS: number
  safeHerds: Herd[]
  selectedHerdId: string
  selectedAnimalCount: number | null
  sessionNotes: string
  currentSessionStatus: SessionStatus | null
  isSaving: boolean
  isEventSaving: boolean
  hasHerds: boolean
  eventNote: string
  eventStatus: string
  actionError: string
  currentMetrics: SessionMetrics | null
  safeCurrentSessionEvents: SessionEvent[]
  position: PositionData | null
  isBaseLayerMenuOpen: boolean
  baseLayer: MapBaseLayer
  showSurveyAreas: boolean
  showSessionEventsOnMap: boolean
  prefetchingMapArea: boolean
  prefetchStatus: string
  isAddingEditTrackpoint: boolean
  selectedEditTrackpointIndex: number | null
  editTrackpointsLength: number
  onSelectedHerdIdChange: (value: string) => void
  onAdjustAnimalCount: (delta: number) => void | Promise<void>
  onSessionNotesChange: (value: string) => void
  onStartOrResumeSession: () => void | Promise<void>
  onPauseSession: () => void | Promise<void>
  onResumeSession: () => void | Promise<void>
  onStopSession: () => void | Promise<void>
  onEventNoteChange: (value: string) => void
  onAddSessionMarkerEvent: (type: SessionEventType, comment?: string) => void | Promise<void>
  onCenterMap: () => void
  onToggleBaseLayerMenu: () => void
  onUpdateBaseLayer: (nextBaseLayer: MapBaseLayer) => void | Promise<void>
  onToggleShowSurveyAreas: () => void
  onToggleShowSessionEventsOnMap: () => void
  onPrefetchVisibleMapArea: () => void | Promise<void>
  onResizeMap?: () => void
  onStartAddEditTrackpoint: () => void
  onRemoveSelectedEditTrackpoint: () => void
  onSaveEditedSession: () => void | Promise<void>
  onCancelEditSession: () => void
}

export function GrazingSessionMapCanvasPanel({
  containerRef,
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
}: GrazingSessionMapCanvasPanelProps) {
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
    <MobileMapTopControls>
      <div className="mb-2 flex justify-start gap-2">
        <button
          type="button"
          aria-label="Auf aktuelle Position zentrieren"
          onClick={onCenterMap}
          disabled={!position}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ccb98a] bg-[#fffdf6] text-neutral-950 shadow-lg disabled:opacity-50"
        >
          <CenterIcon />
        </button>
        <button
          type="button"
          aria-label="Kartengrundlage wählen"
          onClick={onToggleBaseLayerMenu}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ccb98a] bg-[#fffdf6] text-neutral-950 shadow-lg"
        >
          <LayersIcon />
        </button>
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
      </div>

      {isBaseLayerMenuOpen ? (
        <div className="max-h-[48vh] overflow-y-auto rounded-[1rem] border border-[#ccb98a] bg-[rgba(255,253,246,0.96)] p-1.5 shadow-lg">
          <div className="mb-1 px-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-700">
            Kartengrundlage
          </div>
          <button
            type="button"
            onClick={() => void onUpdateBaseLayer('south-tyrol-orthophoto-2023')}
            className={[
              'w-full rounded-xl px-2.5 py-2 text-left text-xs font-medium',
              baseLayer === 'south-tyrol-orthophoto-2023'
                ? 'border border-[#5a5347] bg-[#f1efeb] text-[#17130f]'
                : 'bg-[#f1efeb] text-neutral-950',
            ].join(' ')}
          >
            Orthofoto 2023
          </button>
          <button
            type="button"
            onClick={() => void onUpdateBaseLayer('south-tyrol-basemap')}
            className={[
              'mt-1.5 w-full rounded-xl px-2.5 py-2 text-left text-xs font-medium',
              baseLayer === 'south-tyrol-basemap'
                ? 'border border-[#5a5347] bg-[#f1efeb] text-[#17130f]'
                : 'bg-[#f1efeb] text-neutral-950',
            ].join(' ')}
          >
            BaseMap Südtirol
          </button>
          <button
            type="button"
            onClick={onToggleShowSurveyAreas}
            className={[
              'mt-1.5 w-full rounded-xl px-2.5 py-2 text-left text-xs font-medium',
              showSurveyAreas ? 'bg-[#efe4c8] text-[#17130f]' : 'bg-[#f1efeb] text-neutral-950',
            ].join(' ')}
          >
            Flächen {showSurveyAreas ? 'an' : 'aus'}
          </button>
          <button
            type="button"
            onClick={onToggleShowSessionEventsOnMap}
            className={[
              'mt-1.5 w-full rounded-xl px-2.5 py-2 text-left text-xs font-medium',
              showSessionEventsOnMap
                ? 'bg-[#efe4c8] text-[#17130f]'
                : 'bg-[#f1efeb] text-neutral-950',
            ].join(' ')}
          >
            Ereignisse {showSessionEventsOnMap ? 'an' : 'aus'}
          </button>
          <button
            type="button"
            onClick={() => void onPrefetchVisibleMapArea()}
            disabled={prefetchingMapArea}
            className="mt-1.5 w-full rounded-xl border border-[#ccb98a] bg-[#fffdf6] px-2.5 py-2 text-left text-xs font-medium text-[#17130f] disabled:opacity-50"
          >
            {prefetchingMapArea ? 'Sichert ...' : 'Ausschnitt sichern'}
          </button>
          {prefetchStatus ? (
            <div className="mt-1.5 rounded-xl bg-[#f1efeb] px-2.5 py-2 text-[11px] font-medium text-neutral-900">
              {prefetchStatus}
            </div>
          ) : null}
        </div>
      ) : null}
    </MobileMapTopControls>
  )

  return (
    <div className="relative overflow-hidden rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] shadow-[0_18px_40px_rgba(23,20,18,0.08)] lg:sticky lg:top-4">
      <div
        ref={containerRef}
        className="h-[420px] w-full bg-[#fffdf6] sm:h-[520px] lg:h-[calc(100vh-8rem)]"
      />
      {hasMobileToolbar ? (
        <button
          type="button"
          aria-label={isMobileControlsOpen ? 'Steuerung ausblenden' : 'Steuerung einblenden'}
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2 sm:p-4">
          <MobileMapFloatingCard>
            <div className="flex items-center justify-between gap-2 px-1 pb-2 sm:gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-neutral-900 sm:text-sm">
                  Weidegang bearbeiten
                </div>
                <div className="text-[11px] text-neutral-800 sm:hidden">
                  {isAddingEditTrackpoint
                    ? 'Nächster Tap setzt Punkt.'
                    : selectedEditTrackpointIndex !== null
                      ? `Punkt ${selectedEditTrackpointIndex + 1} aktiv.`
                      : 'Punkt antippen oder Aktion wählen.'}
                </div>
              </div>
              <div className="shrink-0 rounded-full border border-[#ccb98a] bg-[#fffdf6] px-2 py-1 text-[11px] font-medium text-[#17130f] sm:px-3 sm:text-xs">
                {editTrackpointsLength} Punkte
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={onStartAddEditTrackpoint}
                className="rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-2 py-2.5 text-xs font-medium text-[#17130f] sm:px-3 sm:py-3 sm:text-sm"
              >
                Punkt +
              </button>
              <button
                type="button"
                onClick={onRemoveSelectedEditTrackpoint}
                disabled={selectedEditTrackpointIndex === null || editTrackpointsLength <= 1}
                className="rounded-2xl bg-[#f1efeb] px-2 py-2.5 text-xs font-semibold text-neutral-950 disabled:opacity-50 sm:px-3 sm:py-3 sm:text-sm"
              >
                Punkt -
              </button>
              <button
                type="button"
                onClick={() => void onSaveEditedSession()}
                disabled={isSaving}
                className="rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-2 py-2.5 text-xs font-semibold text-[#17130f] disabled:opacity-50 sm:px-3 sm:py-3 sm:text-sm"
              >
                {isSaving ? '...' : 'Speichern'}
              </button>
              <button
                type="button"
                onClick={onCancelEditSession}
                className="rounded-2xl bg-[#f1efeb] px-2 py-2.5 text-xs font-semibold text-neutral-950 sm:px-3 sm:py-3 sm:text-sm"
              >
                Schließen
              </button>
            </div>
          </MobileMapFloatingCard>
        </div>
      ) : null}
    </div>
  )
}
