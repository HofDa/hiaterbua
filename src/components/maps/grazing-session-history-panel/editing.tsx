import {
  formatDistance,
  formatDuration,
  type SessionMetrics,
} from '@/lib/maps/grazing-session-map-helpers'
import type { GrazingSession } from '@/types/domain'

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
          {isSaving ? 'Speichert ...' : 'Änderungen speichern'}
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
