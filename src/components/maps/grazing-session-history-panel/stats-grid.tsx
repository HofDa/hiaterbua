import {
  formatDistance,
  type SessionHistoryStats,
} from '@/lib/maps/grazing-session-map-helpers'
import { formatSpan } from '@/lib/utils/format'

function HistoryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-sm font-medium leading-tight text-ink-muted">{label}</div>
      <div className="mt-0.5 text-lg font-bold tabular-nums text-ink-strong">{value}</div>
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
      <HistoryStat label="Weidegänge" value={String(sessionHistoryStats.totalSessions)} />
      <HistoryStat label="Abgeschlossen" value={String(sessionHistoryStats.finishedSessions)} />
      <HistoryStat
        label="Gesamtdistanz"
        value={formatDistance(sessionHistoryStats.totalDistanceM)}
      />
      <HistoryStat
        label="Gesamtdauer"
        value={formatSpan(sessionHistoryStats.totalDurationS / 60)}
      />
    </div>
  )
}
