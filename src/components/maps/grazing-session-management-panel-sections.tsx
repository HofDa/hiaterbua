import { formatAccuracy } from '@/lib/maps/map-core'
import {
  formatDateTime,
  formatDistance,
  formatDuration,
  getSessionEventLabel,
  type SessionMetrics,
} from '@/lib/maps/grazing-session-map-helpers'
import type {
  Herd,
  SessionEvent,
  SessionEventType,
  SessionStatus,
} from '@/types/domain'

export function GrazingSessionManagementSetupFields({
  safeHerds,
  selectedHerdId,
  selectedAnimalCount,
  sessionNotes,
  currentSessionStatus,
  onSelectedHerdIdChange,
  onAdjustAnimalCount,
  onSessionNotesChange,
}: {
  safeHerds: Herd[]
  selectedHerdId: string
  selectedAnimalCount: number | null
  sessionNotes: string
  currentSessionStatus: SessionStatus | null
  onSelectedHerdIdChange: (value: string) => void
  onAdjustAnimalCount: (delta: number) => void | Promise<void>
  onSessionNotesChange: (value: string) => void
}) {
  const hasSelectedHerd = selectedHerdId.length > 0
  const animalCount = selectedAnimalCount ?? 0

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Herde</label>
        <select
          value={selectedHerdId}
          onChange={(event) => onSelectedHerdIdChange(event.target.value)}
          disabled={currentSessionStatus !== null}
          className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
        >
          <option value="">Bitte wählen</option>
          {safeHerds.map((herd) => (
            <option key={herd.id} value={herd.id}>
              {herd.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Tiere im Weidegang</label>
        <div className="flex items-center gap-3 rounded-[1.35rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-3 py-3">
          <button
            type="button"
            onClick={() => void onAdjustAnimalCount(-1)}
            disabled={!hasSelectedHerd || animalCount <= 0}
            aria-label="Tierzahl verringern"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border border-[#5a5347] bg-[#f1efeb] text-lg font-semibold text-[#17130f] disabled:opacity-40"
          >
            −
          </button>
          <div className="min-w-0 flex-1 text-center">
            <div className="text-2xl font-semibold text-neutral-950">{animalCount}</div>
            <div className="text-xs text-neutral-500">
              {hasSelectedHerd ? 'für diesen Weidegang' : 'zuerst Herde wählen'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void onAdjustAnimalCount(1)}
            disabled={!hasSelectedHerd}
            aria-label="Tierzahl erhöhen"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border border-[#5a5347] bg-[#f1efeb] text-lg font-semibold text-[#17130f] disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Notiz zum Weidegang</label>
        <textarea
          rows={3}
          value={sessionNotes}
          onChange={(event) => onSessionNotesChange(event.target.value)}
          disabled={currentSessionStatus !== null}
          className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
          placeholder="optionale Begleitnotiz"
        />
      </div>
    </div>
  )
}

export function GrazingSessionDesktopControls({
  safeHerdsLength,
  currentSessionStatus,
  isSaving,
  onStartSession,
  onPauseSession,
  onResumeSession,
  onStopSession,
}: {
  safeHerdsLength: number
  currentSessionStatus: SessionStatus | null
  isSaving: boolean
  onStartSession: () => void | Promise<void>
  onPauseSession: () => void | Promise<void>
  onResumeSession: () => void | Promise<void>
  onStopSession: () => void | Promise<void>
}) {
  return (
    <div className="mt-4 hidden grid-cols-2 gap-3 lg:grid">
      <button
        type="button"
        onClick={() => void onStartSession()}
        disabled={isSaving || currentSessionStatus !== null || safeHerdsLength === 0}
        className="rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-4 text-sm font-semibold text-[#17130f] disabled:opacity-50"
      >
        Weidegang starten
      </button>
      <button
        type="button"
        onClick={() => void onPauseSession()}
        disabled={isSaving || currentSessionStatus !== 'active'}
        className="rounded-[1.1rem] bg-[#f1efeb] px-4 py-4 text-sm font-semibold text-neutral-950 disabled:opacity-50"
      >
        Pausieren
      </button>
      <button
        type="button"
        onClick={() => void onResumeSession()}
        disabled={isSaving || currentSessionStatus !== 'paused'}
        className="rounded-[1.1rem] bg-[#f1efeb] px-4 py-4 text-sm font-semibold text-neutral-950 disabled:opacity-50"
      >
        Fortsetzen
      </button>
      <button
        type="button"
        onClick={() => void onStopSession()}
        disabled={isSaving || (currentSessionStatus !== 'active' && currentSessionStatus !== 'paused')}
        className="rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-4 py-4 text-sm font-medium text-[#17130f] disabled:opacity-50"
      >
        Weidegang beenden
      </button>
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

const quickEventButtons: Array<{ type: SessionEventType; label: string; className: string }> = [
  {
    type: 'water',
    label: 'Wasser',
    className:
      'rounded-[1.05rem] border border-[#ccb98a] bg-[#fffdf6] px-3 py-3 text-sm font-semibold text-[#17130f] disabled:opacity-50',
  },
  {
    type: 'rest',
    label: 'Rast-Ort',
    className:
      'rounded-[1.05rem] border border-[#ccb98a] bg-[#fffdf6] px-3 py-3 text-sm font-semibold text-[#17130f] disabled:opacity-50',
  },
  {
    type: 'disturbance',
    label: 'Störung',
    className:
      'rounded-[1.05rem] bg-rose-100 px-3 py-3 text-sm font-semibold text-rose-950 disabled:opacity-50',
  },
  {
    type: 'move',
    label: 'Punkt',
    className:
      'rounded-[1.05rem] border border-[#ccb98a] bg-[#fffdf6] px-3 py-3 text-sm font-semibold text-[#17130f] disabled:opacity-50',
  },
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
    <div className="mt-4 rounded-[1.35rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-neutral-950">Ereignisse erfassen</h3>
        <div className="text-xs font-medium text-neutral-500">mit aktueller Position</div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {quickEventButtons.map((eventButton) => (
          <button
            key={eventButton.type}
            type="button"
            onClick={() => void onAddSessionMarkerEvent(eventButton.type)}
            disabled={isEventSaving}
            className={eventButton.className}
          >
            {eventButton.label}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        <label className="block text-sm font-medium text-neutral-900">Freie Notiz</label>
        <textarea
          rows={2}
          value={eventNote}
          onChange={(event) => onEventNoteChange(event.target.value)}
          className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
          placeholder="Bemerkung zum aktuellen Weidegang"
        />
        <button
          type="button"
          onClick={() => void onAddSessionMarkerEvent('note', eventNote)}
          disabled={isEventSaving || !eventNote.trim()}
          className="w-full rounded-[1.05rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-3 text-sm font-semibold text-[#17130f] disabled:opacity-50"
        >
          Notiz speichern
        </button>
      </div>

      {eventStatus ? (
        <div className="mt-3 rounded-2xl border border-[#c5d3c8] bg-[#edf1ec] px-4 py-3 text-sm text-[#243228]">
          {eventStatus}
        </div>
      ) : null}

      <div className="mt-3 rounded-2xl bg-[#fffdf6] px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
          Letzte Ereignisse
        </div>
        {safeCurrentSessionEvents.length === 0 ? (
          <div className="mt-2 text-sm text-neutral-600">Noch keine Ereignisse erfasst.</div>
        ) : (
          <div className="mt-2 space-y-2">
            {safeCurrentSessionEvents.slice(0, 5).map((sessionEvent) => (
              <div
                key={sessionEvent.id}
                className="rounded-[1rem] border border-[#ccb98a] bg-[#fffdf6] px-3 py-3 text-sm text-neutral-800"
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
                  <div className="mt-1 text-sm text-neutral-700">{sessionEvent.comment}</div>
                ) : null}
                {typeof sessionEvent.lat === 'number' && typeof sessionEvent.lon === 'number' ? (
                  <div className="mt-1 text-xs text-neutral-500">
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
      <div className="min-w-0 rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
        <div className="text-xs leading-tight text-neutral-700">Punkte</div>
        <div className="mt-1 font-medium text-neutral-900">{safeCurrentTrackpointsLength}</div>
      </div>
      <div className="min-w-0 rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
        <div className="text-xs leading-tight text-neutral-700">Distanz</div>
        <div className="mt-1 font-medium text-neutral-900">
          {formatDistance(currentMetrics?.distanceM ?? 0)}
        </div>
      </div>
      <div className="min-w-0 rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
        <div className="text-xs leading-tight text-neutral-700">Dauer</div>
        <div className="mt-1 font-medium text-neutral-900">
          {formatDuration(currentMetrics?.durationS ?? 0)}
        </div>
      </div>
      <div className="min-w-0 rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
        <div className="text-xs leading-tight text-neutral-700">Mittlere Genauigkeit</div>
        <div className="mt-1 font-medium text-neutral-900">
          {formatAccuracy(currentMetrics?.avgAccuracyM)}
        </div>
      </div>
    </div>
  )
}
