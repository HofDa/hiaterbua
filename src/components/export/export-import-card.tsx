'use client'

import type { ImportPreview } from '@/lib/import-export/export-page-helpers'

const importPreviewCountLabels = [
  ['Herden', 'herds'],
  ['Tiere', 'animals'],
  ['Pferche', 'enclosures'],
  ['Untersuchungsflächen', 'surveyAreas'],
  ['Belegungen', 'enclosureAssignments'],
  ['Weidegänge', 'grazingSessions'],
  ['Trackpunkte', 'trackpoints'],
  ['Ereignisse', 'sessionEvents'],
  ['Arbeit', 'workSessions'],
  ['Arbeitsereignisse', 'workEvents'],
  ['Settings', 'settings'],
] as const

type ExportImportCardProps = {
  selectedFileLabel: string
  isAnalyzingImport: boolean
  importPreview: ImportPreview | null
  replaceExisting: boolean
  canReplaceExisting: boolean
  canStartImport: boolean
  isImporting: boolean
  onFileSelection: (file: File | null) => void | Promise<void>
  onReplaceExistingChange: (checked: boolean) => void
  onImport: () => void | Promise<void>
}

export function ExportImportCard({
  selectedFileLabel,
  isAnalyzingImport,
  importPreview,
  replaceExisting,
  canReplaceExisting,
  canStartImport,
  isImporting,
  onFileSelection,
  onReplaceExistingChange,
  onImport,
}: ExportImportCardProps) {
  return (
    <section className="rounded-3xl border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
      <h2 className="text-lg font-semibold">Import</h2>
      <p className="mt-2 text-sm font-medium text-neutral-800">
        Importiert `app-data.json`, Teil-JSON-Exporte wie Herden oder Arbeit, den gesamten
        ZIP-Export oder ein separates GeoJSON für Untersuchungsflächen.
      </p>

      <label className="mt-4 block rounded-2xl border-2 border-dashed border-[#ccb98a] bg-[#fffdf6] px-4 py-4 text-sm text-neutral-900">
        <div className="font-medium text-neutral-900">Datei wählen</div>
        <div className="mt-1 font-medium text-neutral-800">{selectedFileLabel}</div>
        <input
          type="file"
          accept=".zip,.json,.geojson,application/json,application/geo+json,application/zip"
          className="mt-3 block w-full text-sm"
          onChange={(event) => {
            void onFileSelection(event.target.files?.[0] ?? null)
          }}
        />
      </label>

      {isAnalyzingImport ? (
        <div className="mt-4 rounded-2xl border border-[#ccb98a] bg-[#efe4c8] px-4 py-3 text-sm font-semibold text-neutral-900">
          Analysiere Importdatei ...
        </div>
      ) : null}

      {importPreview ? (
        <div className="mt-4 rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-neutral-950">Importübersicht</div>
              <div className="mt-1 text-sm text-neutral-700">{importPreview.sourceLabel}</div>
            </div>
            <div className="rounded-full border border-[#ccb98a] bg-[#efe4c8] px-3 py-1 text-xs font-semibold text-neutral-950">
              {replaceExisting ? 'Ersetzen' : 'Zusammenführen'}
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {importPreviewCountLabels.map(([label, key]) => (
              <div
                key={key}
                className="rounded-2xl border-2 border-[#ccb98a] bg-[#fff8ea] px-3 py-3 text-sm text-neutral-900"
              >
                <div className="font-medium text-neutral-700">{label}</div>
                <div className="mt-1 font-semibold text-neutral-950">{importPreview.counts[key]}</div>
              </div>
            ))}
          </div>

          {importPreview.warnings.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-amber-300 bg-[#fff1c7] px-4 py-3 text-sm font-medium text-amber-950">
              {importPreview.warnings.map((warning) => (
                <div key={warning}>{warning}</div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <label className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-4 text-sm text-neutral-900">
        <input
          type="checkbox"
          checked={replaceExisting}
          onChange={(event) => onReplaceExistingChange(event.target.checked)}
          disabled={!!importPreview && !canReplaceExisting}
          className="mt-1 h-4 w-4 rounded border-neutral-300"
        />
        <span>
          <span className="block font-medium text-neutral-900">Vorhandene Daten vorher löschen</span>
          <span className="block font-medium text-neutral-800">
            Ohne Haken werden Datensätze anhand ihrer `id` ergänzt oder überschrieben.
          </span>
          {importPreview && !canReplaceExisting ? (
            <span className="mt-1 block font-medium text-amber-900">
              Für diese Datei ist `Ersetzen` gesperrt, weil nur Teilmengen importiert werden.
            </span>
          ) : null}
        </span>
      </label>

      <button
        type="button"
        onClick={() => void onImport()}
        disabled={isImporting || isAnalyzingImport || !canStartImport}
        className="mt-4 rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-4 py-4 font-semibold text-[#17130f] disabled:opacity-50"
      >
        {isImporting ? 'Import läuft ...' : 'Import starten'}
      </button>
    </section>
  )
}
