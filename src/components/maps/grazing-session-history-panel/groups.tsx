import { formatAccuracy } from '@/lib/maps/map-core'
import {
  formatDateTime,
  formatDistance,
  formatDuration,
  type GroupedSessionHistory,
} from '@/lib/maps/grazing-session-map-helpers'
import type { GrazingSession, Herd } from '@/types/domain'

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
  herdName,
  isSelected,
  isExpanded,
  isSaving,
  onExpandedHistorySessionChange,
  onSelectSession,
  onStartEditSession,
  onDeleteSession,
}: {
  session: GrazingSession
  herdName: string
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
          <div className="font-medium text-neutral-900">{herdName}</div>
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
  const herdNamesById = new Map(
    safeHerds.map((herd) => [herd.id, herd.name ?? 'Unbekannte Herde'] as const)
  )

  return (
    <div className="mt-4 space-y-4">
      {groupedSessionHistory.map((group) => {
        const isDayExpanded = expandedHistoryDays.includes(group.dayKey)

        return (
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
                {isDayExpanded ? '−' : '+'}
              </span>
            </button>

            {isDayExpanded ? (
              <div className="space-y-3">
                {group.sessions.map((session) => (
                  <GrazingSessionHistorySessionCard
                    key={session.id}
                    session={session}
                    herdName={herdNamesById.get(session.herdId) ?? 'Unbekannte Herde'}
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
        )
      })}
    </div>
  )
}
