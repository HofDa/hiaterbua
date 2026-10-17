'use client'

import {
  formatDateTime,
  formatDuration,
  getLiveDurationS,
  getWorkLabel,
} from '@/lib/work/work-session-helpers'
import type { Enclosure, Herd, WorkSession, WorkStatus } from '@/types/domain'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RecordingControls } from '@/components/ui/recording-controls'
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
        <CardTitle className="text-xl">{getWorkLabel(activeSession)}</CardTitle>
      </CardHeader>

      <CardContent className="p-0 pt-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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

        <div className="mt-4">
          <RecordingControls
            status={activeSession.status === 'paused' ? 'paused' : 'active'}
            isSaving={isSaving}
            stopLabel="Arbeitseinsatz beenden"
            onPause={() => onUpdateStatus('paused')}
            onResume={() => onUpdateStatus('active')}
            onStop={() => onUpdateStatus('finished')}
          />
        </div>
      </CardContent>
    </Card>
  )
}
