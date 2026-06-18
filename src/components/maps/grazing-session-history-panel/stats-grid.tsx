import {
  formatDistance,
  formatDuration,
  type SessionHistoryStats,
} from '@/lib/maps/grazing-session-map-helpers'
import { Card } from '@/components/ui/card'

function HistoryStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="min-w-0 px-4 py-3 shadow-sm">
      <div className="text-xs leading-tight text-ink-muted">{label}</div>
      <div className="mt-1 font-medium text-ink">{value}</div>
    </Card>
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
