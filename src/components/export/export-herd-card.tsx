'use client'

import type { Herd } from '@/types/domain'

type ExportHerdCardProps = {
  exportableHerds: Herd[] | null
  activeHerdExportId: string
  isExportingHerd: boolean
  onSelectedHerdChange: (herdId: string) => void
  onExportSingleHerd: () => void | Promise<void>
}

export function ExportHerdCard({
  exportableHerds,
  activeHerdExportId,
  isExportingHerd,
  onSelectedHerdChange,
  onExportSingleHerd,
}: ExportHerdCardProps) {
  return (
    <section className="rounded-3xl border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
      <h2 className="text-lg font-semibold">Einzelne Herde exportieren</h2>
      <p className="mt-2 text-sm font-medium text-neutral-800">
        Exportiert genau eine Herde als eigene JSON-Datei mit Stammdaten, Tieren, Belegungen,
        zugehörigen Pferchen, Weidegängen und Arbeitseinsätzen.
      </p>

      {exportableHerds === null ? (
        <div className="mt-4 rounded-2xl border border-[#ccb98a] bg-[#efe4c8] px-4 py-3 text-sm font-semibold text-neutral-900">
          Lade Herden ...
        </div>
      ) : exportableHerds.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-neutral-800">
          Keine Herde vorhanden.
        </div>
      ) : (
        <>
          <label className="mt-4 block text-sm font-medium text-neutral-900">
            Herde wählen
            <select
              value={activeHerdExportId}
              onChange={(event) => onSelectedHerdChange(event.target.value)}
              className="mt-2 w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-neutral-950"
            >
              {exportableHerds.map((herd) => (
                <option key={herd.id} value={herd.id}>
                  {herd.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => void onExportSingleHerd()}
            disabled={isExportingHerd}
            className="mt-4 rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-4 py-4 font-semibold text-[#17130f] disabled:opacity-50"
          >
            {isExportingHerd ? 'Erstellt Herden-JSON ...' : 'Herde als JSON herunterladen'}
          </button>
        </>
      )}
    </section>
  )
}
