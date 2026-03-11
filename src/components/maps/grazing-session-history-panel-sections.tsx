import { formatAccuracy } from '@/lib/maps/map-core'
import {
  formatDateTime,
  formatDistance,
  formatDuration,
  getSessionEventLabel,
  type GroupedSessionHistory,
  type SessionHistoryStats,
  type SessionMetrics,
} from '@/lib/maps/grazing-session-map-helpers'
import type {
  GrazingSession,
  Herd,
  SessionEvent,
  TrackPoint,
} from '@/types/domain'

function HistoryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
      <div className="text-xs leading-tight text-neutral-700">{label}</div>
      <div className="mt-1 font-medium text-neutral-900">{value}</div>
    </div>
  )
}

export function GrazingSessionHistoryStatsGrid({
  sessionHistoryStats,
}: {
  sessionHistoryStats: SessionHistoryStats
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
      <HistoryStat label="Sessions" value={String(sessionHistoryStats.totalSessions)} />
      <HistoryStat label="Abgeschlossen" value={String(sessionHistoryStats.finishedSessions)} />
      <HistoryStat
        label="Gesamtdistanz"
        value={formatDistance(sessionHistoryStats.totalDistanceM)}
      />
      <HistoryStat
        label="Gesamtdauer"
        value={formatDuration(sessionHistoryStats.totalDurationS)}
      />
    </div>
  )
}

type GrazingSessionHistoryGroupsProps = {
  groupedSessionHistory: GroupedSessionHistory[]
  safeHerds: Herd[]
  expandedHistoryDays: string[]
  expandedHistorySessionId: string | null
  selectedSessionId: string | null
  isSaving: boolean
  onToggleHistoryDay: (dayKey: string) => void
  onExpandedHistorySessionChange: (sessionId: string) => void
  onSelectSession: (sessionId: string) => void
  onStartEditSession: (sessionId: string) => void
  onDeleteSession: (session: GrazingSession) => void | Promise<void>
}

function GrazingSessionHistorySessionCard({
  session,
  herd,
  isSelected,
  isExpanded,
  isSaving,
  onExpandedHistorySessionChange,
  onSelectSession,
  onStartEditSession,
  onDeleteSession,
}: {
  session: GrazingSession
  herd: Herd | undefined
  isSelected: boolean
  isExpanded: boolean
  isSaving: boolean
  onExpandedHistorySessionChange: (sessionId: string) => void
  onSelectSession: (sessionId: string) => void
  onStartEditSession: (sessionId: string) => void
  onDeleteSession: (session: GrazingSession) => void | Promise<void>
}) {
  return (
    <div
      className={[
        'rounded-2xl px-4 py-3',
        isSelected ? 'bg-[#efe4c8]' : 'bg-neutral-50',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => onExpandedHistorySessionChange(session.id)}
        aria-expanded={isExpanded}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div>
          <div className="font-medium text-neutral-900">{herd?.name ?? 'Unbekannte Herde'}</div>
          <div className="mt-1 text-sm text-neutral-600">
            {formatDateTime(session.startTime)} ·{' '}
            {session.status === 'finished'
              ? 'abgeschlossen'
              : session.status === 'paused'
                ? 'pausiert'
                : 'aktiv'}
            {typeof session.animalCount === 'number' ? ` · ${session.animalCount} Tiere` : ''}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xs text-neutral-500">{formatDistance(session.distanceM)}</div>
          <div className="mt-1 text-base text-neutral-900">{isExpanded ? '−' : '+'}</div>
        </div>
      </button>

      {isExpanded ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-[#fffdf6] px-3 py-3">
              <div className="text-neutral-500">Dauer</div>
              <div className="mt-1 font-medium text-neutral-900">
                {formatDuration(session.durationS)}
              </div>
            </div>
            <div className="rounded-2xl bg-[#fffdf6] px-3 py-3">
              <div className="text-neutral-500">Genauigkeit</div>
              <div className="mt-1 font-medium text-neutral-900">
                {formatAccuracy(session.avgAccuracyM)}
              </div>
            </div>
          </div>

          {session.notes ? <p className="mt-3 text-sm text-neutral-600">{session.notes}</p> : null}

          <div className="mt-3 grid grid-cols-1 gap-2">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onSelectSession(session.id)}
                className="rounded-2xl bg-[#fffdf6] px-3 py-3 text-sm font-medium text-neutral-900"
              >
                Spur anzeigen
              </button>
              <button
                type="button"
                onClick={() => onStartEditSession(session.id)}
                className="rounded-2xl bg-[#fffdf6] px-3 py-3 text-sm font-medium text-neutral-900"
              >
                Bearbeiten
              </button>
              <button
                type="button"
                onClick={() => void onDeleteSession(session)}
                disabled={isSaving || session.status === 'active' || session.status === 'paused'}
                className="rounded-2xl bg-red-50 px-3 py-3 text-sm font-medium text-red-700 disabled:opacity-50"
              >
                Löschen
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

export function GrazingSessionHistoryGroups({
  groupedSessionHistory,
  safeHerds,
  expandedHistoryDays,
  expandedHistorySessionId,
  selectedSessionId,
  isSaving,
  onToggleHistoryDay,
  onExpandedHistorySessionChange,
  onSelectSession,
  onStartEditSession,
  onDeleteSession,
}: GrazingSessionHistoryGroupsProps) {
  return (
    <div className="mt-4 space-y-4">
      {groupedSessionHistory.map((group) => (
        <div key={group.dayKey} className="space-y-3">
          <button
            type="button"
            onClick={() => onToggleHistoryDay(group.dayKey)}
            className="flex w-full items-center justify-between gap-3 rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-left shadow-sm"
          >
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-700">
                {group.label}
              </h3>
              <div className="mt-1 text-xs font-medium text-neutral-600">
                {group.sessions.length} Weidegänge
              </div>
            </div>
            <span className="text-sm font-semibold text-neutral-900">
              {expandedHistoryDays.includes(group.dayKey) ? '−' : '+'}
            </span>
          </button>

          {expandedHistoryDays.includes(group.dayKey) ? (
            <div className="space-y-3">
              {group.sessions.map((session) => (
                <GrazingSessionHistorySessionCard
                  key={session.id}
                  session={session}
                  herd={safeHerds.find((currentHerd) => currentHerd.id === session.herdId)}
                  isSelected={selectedSessionId === session.id}
                  isExpanded={expandedHistorySessionId === session.id}
                  isSaving={isSaving}
                  onExpandedHistorySessionChange={onExpandedHistorySessionChange}
                  onSelectSession={onSelectSession}
                  onStartEditSession={onStartEditSession}
                  onDeleteSession={onDeleteSession}
                />
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

export function GrazingSessionHistoryFocusSummary({
  selectedSession,
  selectedMetrics,
  safeSelectedTrackpoints,
}: {
  selectedSession: GrazingSession | null
  selectedMetrics: SessionMetrics | null
  safeSelectedTrackpoints: TrackPoint[]
}) {
  if (!selectedSession || !selectedMetrics) {
    return null
  }

  return (
    <div className="mt-4 rounded-2xl border border-[#c5d3c8] bg-[#edf1ec] px-4 py-3 text-sm text-[#243228]">
      Fokus: <span className="font-medium">{formatDateTime(selectedSession.startTime)}</span> ·{' '}
      {formatDistance(selectedMetrics.distanceM)} · {formatDuration(selectedMetrics.durationS)} ·{' '}
      {safeSelectedTrackpoints.length} Punkte
      {typeof selectedSession.animalCount === 'number'
        ? ` · ${selectedSession.animalCount} Tiere`
        : ''}
    </div>
  )
}

export function GrazingSessionHistoryFocusEvents({
  selectedSession,
  safeSelectedSessionEvents,
}: {
  selectedSession: GrazingSession | null
  safeSelectedSessionEvents: SessionEvent[]
}) {
  if (!selectedSession) {
    return null
  }

  return (
    <div className="mt-4 rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
        Ereignisse im Fokus-Weidegang
      </div>
      {safeSelectedSessionEvents.length === 0 ? (
        <div className="mt-2 text-sm text-neutral-600">Keine Ereignisse gespeichert.</div>
      ) : (
        <div className="mt-3 space-y-2">
          {safeSelectedSessionEvents.slice(0, 8).map((sessionEvent) => (
            <div
              key={sessionEvent.id}
              className="rounded-[1rem] bg-[#fffdf6] px-3 py-3 text-sm text-neutral-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="font-medium text-neutral-950">
                  {getSessionEventLabel(sessionEvent.type)}
                </div>
                <div className="text-xs text-neutral-500">
                  {formatDateTime(sessionEvent.timestamp)}
                </div>
              </div>
              {sessionEvent.comment ? (
                <div className="mt-1 text-neutral-700">{sessionEvent.comment}</div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function GrazingSessionHistoryEditingSummary({
  editingSessionId,
  editMetrics,
  editTrackpointsLength,
}: {
  editingSessionId: string | null
  editMetrics: SessionMetrics | null
  editTrackpointsLength: number
}) {
  if (!editingSessionId || !editMetrics) {
    return null
  }

  return (
    <div className="mt-4 rounded-2xl border border-[#d2cbc0] bg-[#efe4c8] px-4 py-3 text-sm text-[#17130f]">
      Bearbeitung aktiv: {formatDistance(editMetrics.distanceM)} ·{' '}
      {formatDuration(editMetrics.durationS)} · {editTrackpointsLength} Punkte
    </div>
  )
}

export function GrazingSessionHistoryEditingForm({
  editingSessionId,
  selectedSession,
  editStartTime,
  editEndTime,
  actionError,
  isSaving,
  onEditStartTimeChange,
  onEditEndTimeChange,
  onSaveEditedSession,
  onCancelEditSession,
}: {
  editingSessionId: string | null
  selectedSession: GrazingSession | null
  editStartTime: string
  editEndTime: string
  actionError: string
  isSaving: boolean
  onEditStartTimeChange: (value: string) => void
  onEditEndTimeChange: (value: string) => void
  onSaveEditedSession: () => void | Promise<void>
  onCancelEditSession: () => void
}) {
  if (!editingSessionId || !selectedSession) {
    return null
  }

  if (selectedSession.status !== 'finished') {
    return (
      <div className="mt-4 rounded-2xl border border-[#d2cbc0] bg-[#fffdf6] px-4 py-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
          Zeitkorrektur
        </div>
        <p className="mt-2 text-sm text-neutral-700">
          Die manuelle Zeitkorrektur ist nur fuer abgeschlossene Weidegaenge verfuegbar.
        </p>
        <div className="mt-3">
          <button
            type="button"
            onClick={onCancelEditSession}
            className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-neutral-950"
          >
            Bearbeitung beenden
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-2xl border border-[#d2cbc0] bg-[#fffdf6] px-4 py-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
        Zeitkorrektur
      </div>
      <p className="mt-2 text-sm text-neutral-700">
        Beginn und Ende des abgeschlossenen Weidegangs koennen hier manuell korrigiert werden.
      </p>

      {actionError ? (
        <div className="mt-3 rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {actionError}
        </div>
      ) : null}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-900">Beginn</label>
          <input
            type="datetime-local"
            step={60}
            value={editStartTime}
            onChange={(event) => onEditStartTimeChange(event.target.value)}
            className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-900">Ende</label>
          <input
            type="datetime-local"
            step={60}
            value={editEndTime}
            onChange={(event) => onEditEndTimeChange(event.target.value)}
            className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onSaveEditedSession()}
          disabled={isSaving}
          className="rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-3 text-sm font-semibold text-[#17130f] disabled:opacity-50"
        >
          {isSaving ? 'Speichert ...' : 'Aenderungen speichern'}
        </button>
        <button
          type="button"
          onClick={onCancelEditSession}
          className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-neutral-950"
        >
          Abbrechen
        </button>
      </div>
    </div>
  )
}
