import type { ChangeEvent } from 'react'
import { FormButton, FormLabel, FormTextarea } from '@/components/ui/form'
import { MetaLabel } from '@/components/ui/typography'
import {
  formatDateTime,
  formatDistance,
  formatDuration,
  getSessionEventLabel,
  type SessionMetrics,
} from '@/lib/maps/grazing-session-map-helpers'
import { formatAccuracy } from '@/lib/maps/map-core'
import { cn } from '@/lib/utils/cn'
import type { SessionEvent, SessionEventType } from '@/types/domain'

function MetricItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 app-surface-row px-4 py-3">
      <div className="text-xs leading-tight text-ink-muted">{label}</div>
      <div className="mt-1 font-medium text-ink">{value}</div>
    </div>
  )
}

type GrazingSessionEventCapturePanelProps = {
  isEventSaving: boolean
  eventNote: string
  eventStatus: string
  safeCurrentSessionEvents: SessionEvent[]
  onEventNoteChange: (value: string) => void
  onAddSessionMarkerEvent: (type: SessionEventType, comment?: string) => void | Promise<void>
}

const quickEventButtons: Array<{ type: SessionEventType; label: string }> = [
  { type: 'water', label: 'Wasser' },
  { type: 'rest', label: 'Rast-Ort' },
  { type: 'disturbance', label: 'Störung' },
  { type: 'move', label: 'Punkt' },
]

export function GrazingSessionEventCapturePanel({
  isEventSaving,
  eventNote,
  eventStatus,
  safeCurrentSessionEvents,
  onEventNoteChange,
  onAddSessionMarkerEvent,
}: GrazingSessionEventCapturePanelProps) {
  return (
    <div className="mt-4 rounded-[1.35rem] border border-border bg-surface-raised px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink-strong">Ereignisse erfassen</h3>
        <div className="text-xs font-medium text-ink-soft">mit aktueller Position</div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {quickEventButtons.map((eventButton) => (
          <button
            key={eventButton.type}
            type="button"
            onClick={() => void onAddSessionMarkerEvent(eventButton.type)}
            disabled={isEventSaving}
            className={cn(
              'rounded-[1.05rem] px-3 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50',
              eventButton.type === 'disturbance'
                ? 'border border-error-border bg-error-surface text-error-ink'
                : 'border border-border bg-surface-raised text-ink',
            )}
          >
            {eventButton.label}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        <FormLabel>Freie Notiz</FormLabel>
        <FormTextarea
          rows={2}
          value={eventNote}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
            onEventNoteChange(event.target.value)
          }
          placeholder="Bemerkung zum aktuellen Weidegang"
        />
        <FormButton
          type="button"
          onClick={() => void onAddSessionMarkerEvent('note', eventNote)}
          disabled={isEventSaving || !eventNote.trim()}
          variant="primary"
          className="w-full rounded-[1.05rem]"
        >
          Notiz speichern
        </FormButton>
      </div>

      {eventStatus ? (
        <div className="mt-3 rounded-2xl border border-success-border bg-success-surface px-4 py-3 text-sm text-success-ink">
          {eventStatus}
        </div>
      ) : null}

      <div className="mt-3 rounded-2xl bg-surface-raised px-4 py-3">
        <MetaLabel>Letzte Ereignisse</MetaLabel>
        {safeCurrentSessionEvents.length === 0 ? (
          <div className="mt-2 text-sm text-ink-muted">Noch keine Ereignisse erfasst.</div>
        ) : (
          <div className="mt-2 space-y-2">
            {safeCurrentSessionEvents.slice(0, 5).map((sessionEvent) => (
              <div
                key={sessionEvent.id}
                className="rounded-[1rem] border border-border bg-surface-raised px-3 py-3 text-sm text-ink-soft"
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
                  <div className="mt-1 text-sm text-ink-muted">{sessionEvent.comment}</div>
                ) : null}
                {typeof sessionEvent.lat === 'number' && typeof sessionEvent.lon === 'number' ? (
                  <div className="mt-1 text-xs text-ink-soft">
                    {sessionEvent.lat.toFixed(5)}, {sessionEvent.lon.toFixed(5)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function GrazingSessionMetricsGrid({
  safeCurrentTrackpointsLength,
  currentMetrics,
}: {
  safeCurrentTrackpointsLength: number
  currentMetrics: SessionMetrics | null
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
      <MetricItem label="Punkte" value={safeCurrentTrackpointsLength} />
      <MetricItem label="Distanz" value={formatDistance(currentMetrics?.distanceM ?? 0)} />
      <MetricItem label="Dauer" value={formatDuration(currentMetrics?.durationS ?? 0)} />
      <MetricItem
        label="Mittlere Genauigkeit"
        value={formatAccuracy(currentMetrics?.avgAccuracyM)}
      />
    </div>
  )
}
