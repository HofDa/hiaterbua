import {
  formatDistance,
  formatDuration,
  type SessionHistoryStats,
} from '@/lib/maps/grazing-session-map-helpers'

function HistoryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
      <div className="text-xs leading-tight text-neutral-700">{label}</div>
      <div className="mt-1 font-medium text-neutral-900">{value}</div>
    </div>
  )
}

export function GrazingSessionHistoryStatsGrid({
  sessionHistoryStats,
}: {
  sessionHistoryStats: SessionHistoryStats
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
      <HistoryStat label="Sessions" value={String(sessionHistoryStats.totalSessions)} />
      <HistoryStat label="Abgeschlossen" value={String(sessionHistoryStats.finishedSessions)} />
      <HistoryStat
        label="Gesamtdistanz"
        value={formatDistance(sessionHistoryStats.totalDistanceM)}
      />
      <HistoryStat
        label="Gesamtdauer"
        value={formatDuration(sessionHistoryStats.totalDurationS)}
      />
    </div>
  )
}
