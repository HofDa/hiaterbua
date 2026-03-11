'use client'

import {
  type GroupedSessionHistory,
  type SessionHistoryStats,
  type SessionMetrics,
} from '@/lib/maps/grazing-session-map-helpers'
import {
  GrazingSessionHistoryEditingForm,
  GrazingSessionHistoryEditingSummary,
  GrazingSessionHistoryFocusEvents,
  GrazingSessionHistoryFocusSummary,
  GrazingSessionHistoryGroups,
  GrazingSessionHistoryStatsGrid,
} from '@/components/maps/grazing-session-history-panel-sections'
import { GrazingSessionSurveyAreasPanel } from '@/components/maps/grazing-session-survey-areas-panel'
import type {
  GrazingSession,
  Herd,
  SessionEvent,
  SurveyArea,
  TrackPoint,
} from '@/types/domain'

type GrazingSessionHistoryPanelProps = {
  isHistoryExpanded: boolean
  safeRecentSessions: GrazingSession[]
  safeHerds: Herd[]
  safeSurveyAreas: SurveyArea[]
  selectedSurveyArea: SurveyArea | null
  selectedSurveyAreaId: string | null
  sessionHistoryStats: SessionHistoryStats
  groupedSessionHistory: GroupedSessionHistory[]
  expandedHistoryDays: string[]
  expandedHistorySessionId: string | null
  selectedSessionId: string | null
  selectedSession: GrazingSession | null
  selectedMetrics: SessionMetrics | null
  safeSelectedTrackpoints: TrackPoint[]
  safeSelectedSessionEvents: SessionEvent[]
  editingSessionId: string | null
  editMetrics: SessionMetrics | null
  editTrackpointsLength: number
  editStartTime: string
  editEndTime: string
  actionError: string
  isSaving: boolean
  onToggleHistoryExpanded: () => void
  onToggleHistoryDay: (dayKey: string) => void
  onExpandedHistorySessionChange: (sessionId: string) => void
  onFocusSurveyArea: (surveyArea: SurveyArea) => void
  onSelectSession: (sessionId: string) => void
  onStartEditSession: (sessionId: string) => void
  onEditStartTimeChange: (value: string) => void
  onEditEndTimeChange: (value: string) => void
  onSaveEditedSession: () => void | Promise<void>
  onCancelEditSession: () => void
  onDeleteSession: (session: GrazingSession) => void | Promise<void>
}

export function GrazingSessionHistoryPanel({
  isHistoryExpanded,
  safeRecentSessions,
  safeHerds,
  safeSurveyAreas,
  selectedSurveyArea,
  selectedSurveyAreaId,
  sessionHistoryStats,
  groupedSessionHistory,
  expandedHistoryDays,
  expandedHistorySessionId,
  selectedSessionId,
  selectedSession,
  selectedMetrics,
  safeSelectedTrackpoints,
  safeSelectedSessionEvents,
  editingSessionId,
  editMetrics,
  editTrackpointsLength,
  editStartTime,
  editEndTime,
  actionError,
  isSaving,
  onToggleHistoryExpanded,
  onToggleHistoryDay,
  onExpandedHistorySessionChange,
  onFocusSurveyArea,
  onSelectSession,
  onStartEditSession,
  onEditStartTimeChange,
  onEditEndTimeChange,
  onSaveEditedSession,
  onCancelEditSession,
  onDeleteSession,
}: GrazingSessionHistoryPanelProps) {
  const summary = selectedSession
    ? `${safeRecentSessions.length} Weidegänge · Fokus aktiv`
    : `${safeRecentSessions.length} gespeicherte Weidegänge`

  const historyFocusDetails = (
    <>
      <GrazingSessionHistoryFocusSummary
        selectedSession={selectedSession}
        selectedMetrics={selectedMetrics}
        safeSelectedTrackpoints={safeSelectedTrackpoints}
      />

      <GrazingSessionHistoryFocusEvents
        selectedSession={selectedSession}
        safeSelectedSessionEvents={safeSelectedSessionEvents}
      />

      <GrazingSessionHistoryEditingSummary
        editingSessionId={editingSessionId}
        editMetrics={editMetrics}
        editTrackpointsLength={editTrackpointsLength}
      />
      <GrazingSessionHistoryEditingForm
        editingSessionId={editingSessionId}
        selectedSession={selectedSession}
        editStartTime={editStartTime}
        editEndTime={editEndTime}
        actionError={actionError}
        isSaving={isSaving}
        onEditStartTimeChange={onEditStartTimeChange}
        onEditEndTimeChange={onEditEndTimeChange}
        onSaveEditedSession={onSaveEditedSession}
        onCancelEditSession={onCancelEditSession}
      />
    </>
  )

  const historyGroups = safeRecentSessions.length === 0 ? (
    <p className="mt-3 text-sm text-neutral-700">Noch kein Weidegang gespeichert.</p>
  ) : (
    <GrazingSessionHistoryGroups
      groupedSessionHistory={groupedSessionHistory}
      safeHerds={safeHerds}
      expandedHistoryDays={expandedHistoryDays}
      expandedHistorySessionId={expandedHistorySessionId}
      selectedSessionId={selectedSessionId}
      isSaving={isSaving}
      onToggleHistoryDay={onToggleHistoryDay}
      onExpandedHistorySessionChange={onExpandedHistorySessionChange}
      onSelectSession={onSelectSession}
      onStartEditSession={onStartEditSession}
      onDeleteSession={onDeleteSession}
    />
  )

  return (
    <>
      <div className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)] lg:hidden">
        <button
          type="button"
          onClick={onToggleHistoryExpanded}
          className="flex w-full items-center justify-between gap-3 rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-left shadow-sm"
        >
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">Weidegang-Historie</h2>
            <div className="mt-1 text-sm font-medium text-neutral-700">
              {safeRecentSessions.length} gespeicherte Weidegänge
            </div>
          </div>
          <span className="text-lg font-semibold text-neutral-900">
            {isHistoryExpanded ? '−' : '+'}
          </span>
        </button>

        <GrazingSessionSurveyAreasPanel
          safeSurveyAreas={safeSurveyAreas}
          selectedSurveyArea={selectedSurveyArea}
          selectedSurveyAreaId={selectedSurveyAreaId}
          onFocusSurveyArea={onFocusSurveyArea}
        />

        {isHistoryExpanded ? (
          <>
            <GrazingSessionHistoryStatsGrid sessionHistoryStats={sessionHistoryStats} />
            {historyGroups}
            {historyFocusDetails}
          </>
        ) : null}
      </div>

      <section className="hidden h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)] lg:flex">
        <div className="min-w-0 border-b border-[#ccb98a] pb-4">
          <h2 className="text-lg font-semibold text-neutral-950">Weidegang-Historie</h2>
          <p className="mt-1 text-sm text-neutral-700">{summary}</p>
        </div>

        <div className="mt-4 min-h-0 flex flex-1 flex-col">
          <div className="shrink-0">
            <GrazingSessionSurveyAreasPanel
              safeSurveyAreas={safeSurveyAreas}
              selectedSurveyArea={selectedSurveyArea}
              selectedSurveyAreaId={selectedSurveyAreaId}
              onFocusSurveyArea={onFocusSurveyArea}
            />
            <GrazingSessionHistoryStatsGrid sessionHistoryStats={sessionHistoryStats} />
            {historyFocusDetails}
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-neutral-950">Gespeicherte Weidegänge</div>
              <div className="text-xs font-medium text-neutral-600">
                {safeRecentSessions.length}
              </div>
            </div>
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            {historyGroups}
          </div>
        </div>
      </section>
    </>
  )
}
