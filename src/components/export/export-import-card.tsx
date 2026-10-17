'use client'

import type { ImportPreview } from '@/lib/import-export/export-page-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormButton } from '@/components/ui/form'
import { Alert } from '@/components/ui/alert'

const importPreviewCountLabels = [
  ['Herden', 'herds'],
  ['Tiere', 'animals'],
  ['Pferche', 'enclosures'],
  ['Pflegepläne', 'conservationPlans'],
  ['Pflegechecks', 'careMonitoringChecks'],
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
    <Card>
      <CardHeader>
        <CardTitle>Import</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mt-2 text-sm font-medium text-ink-soft">
          Eine Sicherung (ZIP) wiederherstellen, einzelne exportierte Herden oder Arbeitseinsätze
          einlesen oder Untersuchungsflächen als GeoJSON hinzufügen.
        </p>

        {/* The native file input showed the browser's English "Choose file";
            it stays in the label for the picker but is visually replaced. */}
        <label className="mt-4 block cursor-pointer rounded-2xl border-2 border-dashed border-border bg-surface-raised px-4 py-4 text-sm text-ink focus-within:ring-2 focus-within:ring-ring">
          <span className="inline-flex min-h-11 items-center rounded-[1rem] border-2 border-border-strong bg-surface-muted px-4 font-semibold text-ink-strong">
            Datei auswählen
          </span>
          <span className="mt-2 block font-medium text-ink-soft">{selectedFileLabel}</span>
          <input
            type="file"
            accept=".zip,.json,.geojson,application/json,application/geo+json,application/zip"
            className="sr-only"
            onChange={(event) => {
              void onFileSelection(event.target.files?.[0] ?? null)
          }}
        />
      </label>

      {isAnalyzingImport && (
        <Alert className="mt-4 rounded-2xl border border-border bg-accent text-sm font-semibold text-ink">
          Analysiere Importdatei ...
        </Alert>
      )}

      {importPreview && (
        <Card className="mt-4 rounded-2xl border-2 border-border bg-surface-raised px-4 py-4">
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-ink-strong">Importübersicht</div>
                <div className="mt-1 text-sm text-ink-muted">{importPreview.sourceLabel}</div>
              </div>
              <div className="rounded-full border border-border bg-accent px-3 py-1 text-xs font-semibold text-ink-strong">
                {replaceExisting ? 'Ersetzen' : 'Zusammenführen'}
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {importPreviewCountLabels.map(([label, key]) => (
                <Card
                  key={key}
                  className="rounded-2xl border-2 border-border bg-surface px-3 py-3 text-sm text-ink"
                >
                  <div className="font-medium text-ink-muted">{label}</div>
                  <div className="mt-1 font-semibold text-ink-strong">{importPreview.counts[key]}</div>
                </Card>
              ))}
            </div>

            {importPreview.warnings.length > 0 && (
              <Alert className="mt-4 rounded-2xl border border-warning-border bg-warning-callout text-sm font-medium text-warning-ink">
                {importPreview.warnings.map((warning) => (
                  <div key={warning}>{warning}</div>
                ))}
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <label className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-border bg-surface-raised px-4 py-4 text-sm text-ink">
        <input
          type="checkbox"
          checked={replaceExisting}
          onChange={(event) => onReplaceExistingChange(event.target.checked)}
          disabled={!!importPreview && !canReplaceExisting}
          className="mt-0.5"
        />
        <span>
          <span className="block font-medium text-ink">Vorhandene Daten vorher löschen</span>
          <span className="block font-medium text-ink-soft">
            Ohne Haken werden neue Einträge ergänzt und gleiche Einträge aktualisiert.
          </span>
          {importPreview && !canReplaceExisting && (
            <span className="mt-1 block font-medium text-warning-ink">
              Bei dieser Datei nicht möglich, weil sie nur einen Teil der Daten enthält.
            </span>
          )}
        </span>
      </label>

      <FormButton
        type="button"
        onClick={() => void onImport()}
        disabled={isImporting || isAnalyzingImport || !canStartImport}
        variant="primary"
        className="mt-4"
      >
        {isImporting ? 'Import läuft ...' : 'Import starten'}
      </FormButton>
      </CardContent>
    </Card>
  )
}
