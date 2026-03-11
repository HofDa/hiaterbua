'use client'

import { formatArea } from '@/lib/maps/map-core'
import type { FilteredEnclosureItem } from '@/lib/maps/live-position-map-helpers'
import type { Enclosure } from '@/types/domain'

type LivePositionSavedEnclosuresMobilePanelProps = {
  filteredEnclosures: FilteredEnclosureItem[]
  selectedEnclosure: Enclosure | null
  selectedEnclosureId: string | null
  isSelectedEnclosureInfoOpen: boolean
  showSelectedTrack: boolean
  onSelectedEnclosureChange: (nextId: string) => void
  onClearSelection: () => void
  onToggleSelectedEnclosureInfo: () => void
  onToggleShowSelectedTrack: () => void
}

export function LivePositionSavedEnclosuresMobilePanel({
  filteredEnclosures,
  selectedEnclosure,
  selectedEnclosureId,
  isSelectedEnclosureInfoOpen,
  showSelectedTrack,
  onSelectedEnclosureChange,
  onClearSelection,
  onToggleSelectedEnclosureInfo,
  onToggleShowSelectedTrack,
}: LivePositionSavedEnclosuresMobilePanelProps) {
  return (
    <div className="rounded-[1.4rem] border-2 border-[#3a342a] bg-[#fff8ea] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Gespeicherte Pferche</h2>
        <span className="text-sm text-neutral-500">{filteredEnclosures.length}</span>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium">Pferch wählen</label>
        <select
          className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
          value={selectedEnclosureId ?? ''}
          onChange={(event) => {
            const nextId = event.target.value
            if (!nextId) {
              onClearSelection()
              return
            }

            onSelectedEnclosureChange(nextId)
          }}
        >
          <option value="">Bitte wählen</option>
          {filteredEnclosures.map(({ enclosure }) => (
            <option key={enclosure.id} value={enclosure.id}>
              {enclosure.name}
            </option>
          ))}
        </select>
      </div>

      {filteredEnclosures.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-600">
          Für diesen Filter gibt es aktuell keine Pferche.
        </p>
      ) : null}

      {selectedEnclosure ? (
        <div className="mt-4 rounded-2xl border border-[#d2cbc0] bg-[#efe4c8] px-4 py-3 text-sm text-[#17130f]">
          <button
            type="button"
            onClick={onToggleSelectedEnclosureInfo}
            aria-expanded={isSelectedEnclosureInfoOpen}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span>
              Fokus: <span className="font-medium">{selectedEnclosure.name}</span>
            </span>
            <span className="text-base text-[#17130f]">
              {isSelectedEnclosureInfoOpen ? '−' : '+'}
            </span>
          </button>
          {isSelectedEnclosureInfoOpen ? (
            <>
              <div className="mt-2">
                {formatArea(selectedEnclosure.areaM2)} · {selectedEnclosure.pointsCount ?? 0} Punkte
              </div>
              {selectedEnclosure.notes ? (
                <div className="mt-1 text-[#4f473c]">{selectedEnclosure.notes}</div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {selectedEnclosure?.method === 'walk' ? (
        <button
          type="button"
          onClick={onToggleShowSelectedTrack}
          className="mt-4 w-full rounded-2xl bg-[#fffdf6] px-4 py-3 text-sm font-medium text-neutral-900"
        >
          {showSelectedTrack ? 'Spur ausblenden' : 'Spur anzeigen'}
        </button>
      ) : null}
    </div>
  )
}
