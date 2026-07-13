'use client'

import { MetaLabel } from '@/components/ui/typography'
import {
  formatDateTime,
  getEffectiveHerdCount,
} from '@/lib/maps/live-position-map-helpers'
import { formatArea } from '@/lib/maps/map-core'
import { cn } from '@/lib/utils/cn'
import type { Animal, Enclosure, EnclosureAssignment, Herd } from '@/types/domain'

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'

type LivePositionMobileEnclosureDetailProps = {
  enclosure: Enclosure
  activeAssignment: EnclosureAssignment | undefined
  herdsById: Map<string, Herd>
  animalsByHerdId: Map<string, Animal[]>
  showSelectedTrack: boolean
  onToggleShowSelectedTrack: () => void
  onStartEditEnclosure: (enclosure: Enclosure) => void
  onDeleteEnclosure: (enclosure: Enclosure) => void
}

// Expanded inline under the tapped row, replacing the old detached focus card.
export function LivePositionMobileEnclosureDetail({
  enclosure,
  activeAssignment,
  herdsById,
  animalsByHerdId,
  showSelectedTrack,
  onToggleShowSelectedTrack,
  onStartEditEnclosure,
  onDeleteEnclosure,
}: LivePositionMobileEnclosureDetailProps) {
  const activeHerd = activeAssignment ? herdsById.get(activeAssignment.herdId) : undefined
  const effectiveCount = activeAssignment
    ? activeAssignment.count ??
      getEffectiveHerdCount(activeHerd, animalsByHerdId.get(activeAssignment.herdId) ?? [])
    : null

  return (
    <div className="border-t border-border-soft px-3.5 py-3 text-sm">
      <div className="text-ink-muted">
        {formatArea(enclosure.areaM2)} · {enclosure.pointsCount ?? 0} Punkte
      </div>
      {enclosure.notes ? <div className="mt-1 text-ink-muted">{enclosure.notes}</div> : null}

      {activeAssignment ? (
        <div className="mt-3 rounded-2xl border border-border bg-surface-raised px-3.5 py-3">
          <MetaLabel tracking="wide" tone="soft">
            Belegung
          </MetaLabel>
          <div className="mt-1 text-sm font-semibold text-ink-strong">
            {activeHerd?.name ?? 'Unbekannte Herde'}
          </div>
          <div className="mt-1 text-sm text-ink-muted">
            Seit {formatDateTime(activeAssignment.startTime)}
          </div>
          <div className="mt-0.5 text-sm text-ink-muted">
            Besatz {effectiveCount ?? 'unbekannt'}
          </div>
          {activeAssignment.notes ? (
            <div className="mt-0.5 text-sm text-ink-muted">{activeAssignment.notes}</div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onStartEditEnclosure(enclosure)}
          className={cn(
            'inline-flex items-center justify-center rounded-full border border-border-strong bg-surface-raised px-3 py-2.5 text-xs font-semibold text-ink',
            focusRing,
          )}
        >
          Bearbeiten
        </button>
        <button
          type="button"
          onClick={() => onDeleteEnclosure(enclosure)}
          className={cn(
            'inline-flex items-center justify-center rounded-full border border-error-border bg-error-surface px-3 py-2.5 text-xs font-semibold text-error-ink',
            focusRing,
          )}
        >
          Löschen
        </button>
      </div>

      {enclosure.method === 'walk' ? (
        <button
          type="button"
          onClick={onToggleShowSelectedTrack}
          className={cn(
            'mt-2 w-full rounded-2xl bg-surface-raised px-4 py-3 text-sm font-medium text-ink',
            focusRing,
          )}
        >
          {showSelectedTrack ? 'Spur ausblenden' : 'Spur anzeigen'}
        </button>
      ) : null}
    </div>
  )
}
