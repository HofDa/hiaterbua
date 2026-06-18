import {
  formatDateTime,
  formatDistance,
  formatDuration,
  getSessionEventLabel,
  type SessionMetrics,
} from '@/lib/maps/grazing-session-map-helpers'
import { MetaLabel } from '@/components/ui/typography'
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
    <div className="mt-4 rounded-2xl border border-success-border bg-success-surface px-4 py-3 text-sm text-success-ink">
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
    <div className="mt-4 rounded-2xl border border-border bg-surface-raised px-4 py-4 shadow-sm">
      <MetaLabel>
        Ereignisse im Fokus-Weidegang
      </MetaLabel>
      {safeSelectedSessionEvents.length === 0 ? (
        <div className="mt-2 text-sm text-ink-muted">Keine Ereignisse gespeichert.</div>
      ) : (
        <div className="mt-3 space-y-2">
          {safeSelectedSessionEvents.slice(0, 8).map((sessionEvent) => (
            <div
              key={sessionEvent.id}
              className="rounded-[1rem] bg-surface-raised px-3 py-3 text-sm text-ink-soft"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="font-medium text-ink-strong">
                  {getSessionEventLabel(sessionEvent.type)}
                </div>
                <div className="text-xs text-ink-soft">
                  {formatDateTime(sessionEvent.timestamp)}
                </div>
              </div>
              {sessionEvent.comment ? (
                <div className="mt-1 text-ink-muted">{sessionEvent.comment}</div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
