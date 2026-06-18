import {
  formatDistance,
  formatDuration,
  type SessionMetrics,
} from '@/lib/maps/grazing-session-map-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { FormField, FormLabel, FormInput, FormButton } from '@/components/ui/form'
import { Alert, ErrorAlert } from '@/components/ui/alert'
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
    <Alert variant="info" className="mt-4 text-sm text-ink">
      Bearbeitung aktiv: {formatDistance(editMetrics.distanceM)} ·{' '}
      {formatDuration(editMetrics.durationS)} · {editTrackpointsLength} Punkte
    </Alert>
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
      <Card className="mt-4">
        <CardContent>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
            Zeitkorrektur
          </div>
          <p className="mt-2 text-sm text-neutral-700">
            Die manuelle Zeitkorrektur ist nur fuer abgeschlossene Weidegaenge verfuegbar.
          </p>
          <div className="mt-3">
            <FormButton
              type="button"
              onClick={onCancelEditSession}
              variant="secondary"
            >
              Bearbeitung beenden
            </FormButton>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mt-4">
      <CardContent>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
          Zeitkorrektur
        </div>
        <p className="mt-2 text-sm text-neutral-700">
          Beginn und Ende des abgeschlossenen Weidegangs koennen hier manuell korrigiert werden.
        </p>

        {actionError && (
          <ErrorAlert>{actionError}</ErrorAlert>
        )}

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <FormField>
            <FormLabel>Beginn</FormLabel>
            <FormInput
              type="datetime-local"
              step={60}
              value={editStartTime}
              onChange={(event) => onEditStartTimeChange(event.target.value)}
            />
          </FormField>

          <FormField>
            <FormLabel>Ende</FormLabel>
            <FormInput
              type="datetime-local"
              step={60}
              value={editEndTime}
              onChange={(event) => onEditEndTimeChange(event.target.value)}
            />
          </FormField>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <FormButton
            type="button"
            onClick={() => void onSaveEditedSession()}
            disabled={isSaving}
            variant="primary"
          >
            {isSaving ? 'Speichert ...' : 'Änderungen speichern'}
          </FormButton>
          <FormButton
            type="button"
            onClick={onCancelEditSession}
            variant="secondary"
          >
            Abbrechen
          </FormButton>
        </div>
      </CardContent>
    </Card>
  )
}
