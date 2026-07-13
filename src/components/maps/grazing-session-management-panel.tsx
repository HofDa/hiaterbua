'use client'

import {
  GrazingSessionActiveSummary,
  GrazingSessionEventCapturePanel,
  GrazingSessionMobileStartFlow,
  GrazingSessionMetricsGrid,
  GrazingSessionMobileControls,
} from '@/components/maps/grazing-session-management-panel-sections'
import { useGrazingSessionMapStore } from '@/components/maps/hooks/use-grazing-session-map-store'

export function GrazingSessionManagementPanel() {
  const {
    safeHerds,
    selectedHerdId,
    selectedAnimalCount,
    sessionNotes,
    currentSessionStatus,
    isSaving,
    isEventSaving,
    eventNote,
    eventStatus,
    actionError,
    safeCurrentTrackpointsLength,
    currentMetrics,
    safeCurrentSessionEvents,
  } = useGrazingSessionMapStore((state) => state.management)
  const {
    onSelectedHerdIdChange,
    onAdjustAnimalCount,
    onSessionNotesChange,
    onStartSession,
    onPauseSession,
    onResumeSession,
    onStopSession,
    onEventNoteChange,
    onAddSessionMarkerEvent,
  } = useGrazingSessionMapStore((state) => state.managementHandles)
  const panelContent = (
    <>
      {currentSessionStatus === null ? (
        <GrazingSessionMobileStartFlow
          safeHerds={safeHerds}
          selectedHerdId={selectedHerdId}
          selectedAnimalCount={selectedAnimalCount}
          sessionNotes={sessionNotes}
          isSaving={isSaving}
          onSelectedHerdIdChange={onSelectedHerdIdChange}
          onAdjustAnimalCount={onAdjustAnimalCount}
          onSessionNotesChange={onSessionNotesChange}
          onStartSession={onStartSession}
        />
      ) : (
        <>
          <GrazingSessionActiveSummary
            safeHerds={safeHerds}
            selectedHerdId={selectedHerdId}
            selectedAnimalCount={selectedAnimalCount}
          />

          <GrazingSessionMobileControls
            safeHerdsLength={safeHerds.length}
            currentSessionStatus={currentSessionStatus}
            isSaving={isSaving}
            onStartSession={onStartSession}
            onPauseSession={onPauseSession}
            onResumeSession={onResumeSession}
            onStopSession={onStopSession}
          />
        </>
      )}

      {actionError ? (
        <div className="mt-4 rounded-2xl bg-error-surface px-4 py-3 text-sm text-error-ink">
          {actionError}
        </div>
      ) : null}

      {/* Live metrics before event capture: duration/distance is what gets
          glanced at constantly, the events card is tall and used on demand. */}
      {currentSessionStatus ? (
        <GrazingSessionMetricsGrid
          safeCurrentTrackpointsLength={safeCurrentTrackpointsLength}
          currentMetrics={currentMetrics}
        />
      ) : null}

      {currentSessionStatus ? (
        <GrazingSessionEventCapturePanel
          isEventSaving={isEventSaving}
          eventNote={eventNote}
          eventStatus={eventStatus}
          safeCurrentSessionEvents={safeCurrentSessionEvents}
          onEventNoteChange={onEventNoteChange}
          onAddSessionMarkerEvent={onAddSessionMarkerEvent}
        />
      ) : null}
    </>
  )

  return (
    <div
      data-grazing-session-management-card="true"
      className="app-panel p-5 lg:hidden"
    >
      <h2 className="text-lg font-semibold">
        {currentSessionStatus === null
          ? 'Weidegang starten'
          : currentSessionStatus === 'paused'
            ? 'Weidegang pausiert'
            : 'Laufender Weidegang'}
      </h2>
      <div className="mt-4">{panelContent}</div>
    </div>
  )
}
