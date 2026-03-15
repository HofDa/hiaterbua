'use client'

import type { SessionMetrics } from '@/lib/maps/grazing-session-map-helpers'
import {
  GrazingSessionActiveSummary,
  GrazingSessionEventCapturePanel,
  GrazingSessionMobileStartFlow,
  GrazingSessionMetricsGrid,
  GrazingSessionMobileControls,
} from '@/components/maps/grazing-session-management-panel-sections'
import type {
  Herd,
  SessionEvent,
  SessionEventType,
  SessionStatus,
} from '@/types/domain'

type GrazingSessionManagementPanelProps = {
  safeHerds: Herd[]
  selectedHerdId: string
  selectedAnimalCount: number | null
  sessionNotes: string
  currentSessionStatus: SessionStatus | null
  isSaving: boolean
  isEventSaving: boolean
  eventNote: string
  eventStatus: string
  actionError: string
  safeCurrentTrackpointsLength: number
  currentMetrics: SessionMetrics | null
  safeCurrentSessionEvents: SessionEvent[]
  onSelectedHerdIdChange: (value: string) => void
  onAdjustAnimalCount: (delta: number) => void | Promise<void>
  onSessionNotesChange: (value: string) => void
  onStartSession: () => void | Promise<void>
  onPauseSession: () => void | Promise<void>
  onResumeSession: () => void | Promise<void>
  onStopSession: () => void | Promise<void>
  onEventNoteChange: (value: string) => void
  onAddSessionMarkerEvent: (type: SessionEventType, comment?: string) => void | Promise<void>
}

export function GrazingSessionManagementPanel({
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
  onSelectedHerdIdChange,
  onAdjustAnimalCount,
  onSessionNotesChange,
  onStartSession,
  onPauseSession,
  onResumeSession,
  onStopSession,
  onEventNoteChange,
  onAddSessionMarkerEvent,
}: GrazingSessionManagementPanelProps) {
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

      {actionError ? (
        <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      {currentSessionStatus ? (
        <GrazingSessionMetricsGrid
          safeCurrentTrackpointsLength={safeCurrentTrackpointsLength}
          currentMetrics={currentMetrics}
        />
      ) : null}
    </>
  )

  return (
    <div
      data-grazing-session-management-card="true"
      className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)] lg:hidden"
    >
      <h2 className="text-lg font-semibold">Weidegang verwalten</h2>
      <div className="mt-4">{panelContent}</div>
    </div>
  )
}
