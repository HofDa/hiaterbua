import {
  formatDateTime,
  formatDistance,
  formatDuration,
  getSessionEventLabel,
  type SessionMetrics,
} from '@/lib/maps/grazing-session-map-helpers'
import type { GrazingSession, SessionEvent, TrackPoint } from '@/types/domain'

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
