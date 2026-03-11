import { formatAccuracy } from '@/lib/maps/map-core'
import {
  formatDateTime,
  formatDurationSeconds,
  type FilteredEnclosureItem,
  type WalkTrackSummary,
} from '@/lib/maps/live-position-map-helpers'
import type { Enclosure } from '@/types/domain'

function SidebarStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-[#ccb98a] bg-[#fffdf6] px-3 py-3">
      <div className="text-xs font-medium text-neutral-600">{label}</div>
      <div className="mt-1 text-base font-semibold text-neutral-950">{value}</div>
    </div>
  )
}

export function LivePositionSavedEnclosureStatsSection({
  stats,
}: {
  stats: FilteredEnclosureItem['stats'] | null | undefined
}) {
  return (
    <div className="rounded-2xl bg-[#fffdf6] px-4 py-3 text-sm text-neutral-800">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-600">
        Auswertung
      </div>
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
        <div className="mt-2 text-xs text-neutral-700">
          Letzte Nutzung:{' '}
          <span className="font-medium text-neutral-900">
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
    <div className="mt-3 rounded-2xl bg-[#fffdf6] px-4 py-3 text-sm text-neutral-600">
      <div>
        Spurpunkte:{' '}
        <span className="font-medium text-neutral-900">{selectedTrackSummary.count}</span>
      </div>
      <div className="mt-1">
        Mittlere Genauigkeit:{' '}
        <span className="font-medium text-neutral-900">
          {selectedTrackSummary.avgAccuracyM !== null
            ? formatAccuracy(selectedTrackSummary.avgAccuracyM)
            : 'unbekannt'}
        </span>
      </div>
      <div className="mt-1">
        Start:{' '}
        <span className="font-medium text-neutral-900">
          {selectedTrackSummary.firstTimestamp
            ? new Date(selectedTrackSummary.firstTimestamp).toLocaleString('de-DE')
            : 'unbekannt'}
        </span>
      </div>
      <div className="mt-1">
        Ende:{' '}
        <span className="font-medium text-neutral-900">
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
      className={[
        'mt-3 grid gap-2',
        enclosure.method === 'walk' ? 'grid-cols-2' : 'grid-cols-3',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => onFocusEnclosure(enclosure)}
        className="rounded-2xl bg-[#fffdf6] px-3 py-3 text-sm font-medium text-neutral-900"
      >
        Fokus
      </button>
      <button
        type="button"
        onClick={() => onStartEditEnclosure(enclosure)}
        className="rounded-2xl bg-[#fffdf6] px-3 py-3 text-sm font-medium text-neutral-900"
      >
        Bearbeiten
      </button>
      {enclosure.method === 'walk' ? (
        <button
          type="button"
          onClick={() => onToggleShowSelectedTrack(enclosure.id)}
          className="rounded-2xl bg-[#fffdf6] px-3 py-3 text-sm font-medium text-neutral-900"
        >
          {isSelected && showSelectedTrack ? 'Spur ausblenden' : 'Spur zeigen'}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => onDeleteEnclosure(enclosure)}
        className="rounded-2xl bg-red-50 px-3 py-3 text-sm font-medium text-red-700"
      >
        Löschen
      </button>
    </div>
  )
}
