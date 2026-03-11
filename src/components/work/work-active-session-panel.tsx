'use client'

import {
  formatDateTime,
  formatDuration,
  getLiveDurationS,
  getWorkLabel,
} from '@/lib/work/work-session-helpers'
import type { Enclosure, Herd, WorkSession, WorkStatus } from '@/types/domain'

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
    <div className="mt-4 rounded-[1.5rem] border border-[#ccb98a] bg-[#fffdf6] p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5e5549]">
        Aktiver Einsatz
      </div>
      <div className="mt-1 text-xl font-semibold text-[#17130f]">{getWorkLabel(activeSession)}</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
          <div className="text-sm text-neutral-700">Status</div>
          <div className="mt-1 font-medium text-neutral-900">
            {activeSession.status === 'active' ? 'Läuft' : 'Pausiert'}
          </div>
        </div>
        <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
          <div className="text-sm text-neutral-700">Beginn</div>
          <div className="mt-1 font-medium text-neutral-900">
            {formatDateTime(activeSession.startTime)}
          </div>
        </div>
        <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
          <div className="text-sm text-neutral-700">Dauer</div>
          <div className="mt-1 font-medium text-neutral-900">
            {formatDuration(getLiveDurationS(activeSession, nowMs))}
          </div>
        </div>
      </div>

      {activeSession.reminderIntervalMin ? (
        <div className="mt-3 rounded-[1.1rem] border border-[#d2cbc0] bg-[#efe4c8] px-4 py-3 text-sm text-[#17130f] shadow-sm">
          Erinnerung alle{' '}
          <span className="font-medium text-neutral-900">
            {activeSession.reminderIntervalMin} min
          </span>
          {nextReminderMs ? (
            <span>
              {' '}
              · nächste in{' '}
              <span className="font-medium text-neutral-900">
                {formatDuration(Math.max(0, Math.round((nextReminderMs - nowMs) / 1000)))}
              </span>
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 text-sm text-neutral-700">
        {activeSession.herdId ? (
          <div>Herde: {herdsById.get(activeSession.herdId)?.name ?? 'Unbekannt'}</div>
        ) : null}
        {activeSession.enclosureId ? (
          <div>Pferch: {enclosuresById.get(activeSession.enclosureId)?.name ?? 'Unbekannt'}</div>
        ) : null}
        {activeSession.notes ? <div className="mt-1">{activeSession.notes}</div> : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {activeSession.status === 'active' ? (
          <button
            type="button"
            onClick={() => void onUpdateStatus('paused')}
            disabled={isSaving}
            className="rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-4 text-base font-semibold text-[#17130f] shadow-[0_12px_24px_rgba(40,34,26,0.08)] disabled:opacity-50"
          >
            Pause setzen
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void onUpdateStatus('active')}
            disabled={isSaving}
            className="rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-4 text-base font-semibold text-[#17130f] shadow-[0_12px_24px_rgba(40,34,26,0.08)] disabled:opacity-50"
          >
            Fortsetzen
          </button>
        )}
        <button
          type="button"
          onClick={() => void onUpdateStatus('finished')}
          disabled={isSaving}
          className="rounded-[1.1rem] border border-red-300 bg-[linear-gradient(135deg,#fff3f1,#ffd9d2)] px-4 py-4 text-base font-semibold text-red-900 shadow-[0_10px_20px_rgba(127,29,29,0.14)] disabled:opacity-50"
        >
          Einsatz beenden
        </button>
      </div>
    </div>
  )
}
