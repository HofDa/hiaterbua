import { formatAccuracy } from '@/lib/maps/map-core'
import {
  formatDateTime,
  formatDurationSeconds,
  type FilteredEnclosureItem,
  type WalkTrackSummary,
} from '@/lib/maps/live-position-map-helpers'
import { MetaLabel } from '@/components/ui/typography'
import { cn } from '@/lib/utils/cn'
import type { Enclosure } from '@/types/domain'

function SidebarStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-border bg-surface-raised px-3 py-3">
      <div className="text-xs font-medium text-ink-muted">{label}</div>
      <div className="mt-1 text-base font-semibold text-ink-strong">{value}</div>
    </div>
  )
}

export function LivePositionSavedEnclosureStatsSection({
  stats,
}: {
  stats: FilteredEnclosureItem['stats'] | null | undefined
}) {
  return (
    <div className="rounded-2xl bg-surface-raised px-4 py-3 text-sm text-ink-soft">
      <MetaLabel tracking="wide">
        Auswertung
      </MetaLabel>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <SidebarStat label="Nutzungen" value={String(stats?.totalAssignments ?? 0)} />
        <SidebarStat
          label="Gesamtdauer"
          value={formatDurationSeconds(stats?.totalDurationS ?? 0)}
        />
        <SidebarStat label="Herden" value={String(stats?.uniqueHerdsCount ?? 0)} />
        <SidebarStat label="Ø Besatz" value={String(stats?.averageCount ?? 'unbekannt')} />
      </div>
      {stats?.lastEndTime ? (
        <div className="mt-2 text-xs text-ink-muted">
          Letzte Nutzung:{' '}
          <span className="font-medium text-ink">
            {formatDateTime(stats.lastEndTime)}
          </span>
        </div>
      ) : null}
    </div>
  )
}

export function LivePositionSavedEnclosureTrackSummarySection({
  selectedTrackSummary,
}: {
  selectedTrackSummary: WalkTrackSummary
}) {
  return (
    <div className="mt-3 rounded-2xl bg-surface-raised px-4 py-3 text-sm text-ink-muted">
      <div>
        Spurpunkte:{' '}
        <span className="font-medium text-ink">{selectedTrackSummary.count}</span>
      </div>
      <div className="mt-1">
        Mittlere Genauigkeit:{' '}
        <span className="font-medium text-ink">
          {selectedTrackSummary.avgAccuracyM !== null
            ? formatAccuracy(selectedTrackSummary.avgAccuracyM)
            : 'unbekannt'}
        </span>
      </div>
      <div className="mt-1">
        Start:{' '}
        <span className="font-medium text-ink">
          {selectedTrackSummary.firstTimestamp
            ? new Date(selectedTrackSummary.firstTimestamp).toLocaleString('de-DE')
            : 'unbekannt'}
        </span>
      </div>
      <div className="mt-1">
        Ende:{' '}
        <span className="font-medium text-ink">
          {selectedTrackSummary.lastTimestamp
            ? new Date(selectedTrackSummary.lastTimestamp).toLocaleString('de-DE')
            : 'unbekannt'}
        </span>
      </div>
    </div>
  )
}

type LivePositionSavedEnclosureActionsSectionProps = {
  enclosure: Enclosure
  isSelected: boolean
  showSelectedTrack: boolean
  onFocusEnclosure: (enclosure: Enclosure) => void
  onStartEditEnclosure: (enclosure: Enclosure) => void
  onToggleShowSelectedTrack: (enclosureId: string) => void
  onDeleteEnclosure: (enclosure: Enclosure) => void
}

export function LivePositionSavedEnclosureActionsSection({
  enclosure,
  isSelected,
  showSelectedTrack,
  onFocusEnclosure,
  onStartEditEnclosure,
  onToggleShowSelectedTrack,
  onDeleteEnclosure,
}: LivePositionSavedEnclosureActionsSectionProps) {
  return (
    <div
      className={cn(
        'mt-3 grid gap-2',
        enclosure.method === 'walk' ? 'grid-cols-2' : 'grid-cols-3',
      )}
    >
      <button
        type="button"
        onClick={() => onFocusEnclosure(enclosure)}
        className="rounded-2xl bg-surface-raised px-3 py-3 text-sm font-medium text-ink"
      >
        Fokus
      </button>
      <button
        type="button"
        onClick={() => onStartEditEnclosure(enclosure)}
        className="rounded-2xl bg-surface-raised px-3 py-3 text-sm font-medium text-ink"
      >
        Bearbeiten
      </button>
      {enclosure.method === 'walk' ? (
        <button
          type="button"
          onClick={() => onToggleShowSelectedTrack(enclosure.id)}
          className="rounded-2xl bg-surface-raised px-3 py-3 text-sm font-medium text-ink"
        >
          {isSelected && showSelectedTrack ? 'Spur ausblenden' : 'Spur zeigen'}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => onDeleteEnclosure(enclosure)}
        className="rounded-2xl bg-error-surface px-3 py-3 text-sm font-medium text-error-ink"
      >
        Löschen
      </button>
    </div>
  )
}
