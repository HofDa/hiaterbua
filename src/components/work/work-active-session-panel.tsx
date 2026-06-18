'use client'

import {
  formatDateTime,
  formatDuration,
  getLiveDurationS,
  getWorkLabel,
} from '@/lib/work/work-session-helpers'
import type { Enclosure, Herd, WorkSession, WorkStatus } from '@/types/domain'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormButton } from '@/components/ui/form'
import { Alert } from '@/components/ui/alert'
import { StatCard } from '@/components/ui/stat-card'

type WorkActiveSessionPanelProps = {
  activeSession: WorkSession
  nextReminderMs: number | null
  nowMs: number
  herdsById: Map<string, Herd>
  enclosuresById: Map<string, Enclosure>
  isSaving: boolean
  onUpdateStatus: (status: WorkStatus) => void | Promise<void>
}

export function WorkActiveSessionPanel({
  activeSession,
  nextReminderMs,
  nowMs,
  herdsById,
  enclosuresById,
  isSaving,
  onUpdateStatus,
}: WorkActiveSessionPanelProps) {
  return (
    <Card className="mt-4 rounded-[1.5rem] border border-border bg-surface-raised p-4 shadow-sm">
      <CardHeader className="p-0">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
          Aktiver Einsatz
        </CardTitle>
        <div className="mt-1 text-xl font-semibold text-ink">{getWorkLabel(activeSession)}</div>
      </CardHeader>

      <CardContent className="p-0 pt-4">
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Status"
            value={activeSession.status === 'active' ? 'Läuft' : 'Pausiert'}
          />
          <StatCard label="Beginn" value={formatDateTime(activeSession.startTime)} />
          <StatCard
            label="Dauer"
            value={formatDuration(getLiveDurationS(activeSession, nowMs))}
          />
        </div>

        {activeSession.reminderIntervalMin && (
          <Alert className="mt-3 rounded-[1.1rem] border border-border-soft bg-accent px-4 py-3 text-sm text-ink shadow-sm">
            Erinnerung alle{' '}
            <span className="font-medium text-ink">
              {activeSession.reminderIntervalMin} min
            </span>
            {nextReminderMs ? (
              <span>
                {' '}
                · nächste in{' '}
                <span className="font-medium text-ink">
                  {formatDuration(Math.max(0, Math.round((nextReminderMs - nowMs) / 1000)))}
                </span>
              </span>
            ) : null}
          </Alert>
        )}

        <div className="mt-3 text-sm text-ink-muted">
          {activeSession.herdId && (
            <div>Herde: {herdsById.get(activeSession.herdId)?.name ?? 'Unbekannt'}</div>
          )}
          {activeSession.enclosureId && (
            <div>Pferch: {enclosuresById.get(activeSession.enclosureId)?.name ?? 'Unbekannt'}</div>
          )}
          {activeSession.notes && <div className="mt-1">{activeSession.notes}</div>}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {activeSession.status === 'active' ? (
            <FormButton
              type="button"
              onClick={() => void onUpdateStatus('paused')}
              disabled={isSaving}
              className="min-h-[4.5rem] rounded-[1.3rem] border-2 text-lg app-shadow-action-strong"
            >
              Pause setzen
            </FormButton>
          ) : (
            <FormButton
              type="button"
              onClick={() => void onUpdateStatus('active')}
              disabled={isSaving}
              className="min-h-[4.5rem] rounded-[1.3rem] border-2 text-lg app-shadow-action-strong"
            >
              Fortsetzen
            </FormButton>
          )}
          <FormButton
            type="button"
            onClick={() => void onUpdateStatus('finished')}
            disabled={isSaving}
            variant="danger"
            className="min-h-[4.5rem] rounded-[1.3rem] border-2 text-lg shadow-[0_12px_24px_rgba(127,29,29,0.16)]"
          >
            Einsatz beenden
          </FormButton>
        </div>
      </CardContent>
    </Card>
  )
}
