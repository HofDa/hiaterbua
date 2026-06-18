'use client'

import {
  GrazingSessionHistoryEditingForm,
  GrazingSessionHistoryEditingSummary,
  GrazingSessionHistoryFocusEvents,
  GrazingSessionHistoryFocusSummary,
  GrazingSessionHistoryGroups,
  GrazingSessionHistoryStatsGrid,
} from '@/components/maps/grazing-session-history-panel-sections'
import { GrazingSessionSurveyAreasPanel } from '@/components/maps/grazing-session-survey-areas-panel'
import { useGrazingSessionMapStore } from '@/components/maps/hooks/use-grazing-session-map-store'

export function GrazingSessionHistoryPanel() {
  const {
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
  } = useGrazingSessionMapStore((state) => state.history)
  const {
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
  } = useGrazingSessionMapStore((state) => state.historyHandles)
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
    <p className="mt-3 text-sm text-ink-muted">Noch kein Weidegang gespeichert.</p>
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
      <div className="space-y-4 lg:hidden">
        <div className="app-panel p-5">
          <GrazingSessionSurveyAreasPanel
            safeSurveyAreas={safeSurveyAreas}
            selectedSurveyArea={selectedSurveyArea}
            selectedSurveyAreaId={selectedSurveyAreaId}
            onFocusSurveyArea={onFocusSurveyArea}
          />
        </div>

        <div className="overflow-hidden app-panel p-5">
          <button
            type="button"
            onClick={onToggleHistoryExpanded}
            className="flex w-full items-center justify-between gap-3 app-surface-row px-4 py-3 text-left"
          >
            <div>
              <h2 className="text-lg font-semibold text-ink-strong">Weidegang-Historie</h2>
              <div className="mt-1 text-sm font-medium text-ink-muted">
                {safeRecentSessions.length} gespeicherte Weidegänge
              </div>
            </div>
            <span className="text-lg font-semibold text-ink">
              {isHistoryExpanded ? '−' : '+'}
            </span>
          </button>

          {isHistoryExpanded ? (
            <>
              <GrazingSessionHistoryStatsGrid sessionHistoryStats={sessionHistoryStats} />
              {historyGroups}
              {historyFocusDetails}
            </>
          ) : null}
        </div>
      </div>

      <section className="hidden h-[calc(100vh-8rem)] flex-col overflow-hidden app-panel p-5 lg:flex">
        <div className="min-w-0 border-b border-border pb-4">
          <h2 className="text-lg font-semibold text-ink-strong">Weidegang-Historie</h2>
          <p className="mt-1 text-sm text-ink-muted">{summary}</p>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          <GrazingSessionSurveyAreasPanel
            safeSurveyAreas={safeSurveyAreas}
            selectedSurveyArea={selectedSurveyArea}
            selectedSurveyAreaId={selectedSurveyAreaId}
            onFocusSurveyArea={onFocusSurveyArea}
          />
          <GrazingSessionHistoryStatsGrid sessionHistoryStats={sessionHistoryStats} />
          {historyFocusDetails}
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-ink-strong">Gespeicherte Weidegänge</div>
            <div className="text-xs font-medium text-ink-muted">{safeRecentSessions.length}</div>
          </div>
          <div className="pb-1">{historyGroups}</div>
        </div>
      </section>
    </>
  )
}
