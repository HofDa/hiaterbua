'use client'

import { useEffect, useRef } from 'react'
import type { ImportPreview } from '@/lib/import-export/export-page-helpers'
import {
  consumePendingLaunchFiles,
  subscribeToLaunchFiles,
} from '@/lib/import-export/launch-files'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormButton } from '@/components/ui/form'
import { Alert } from '@/components/ui/alert'

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
  // Keep the latest handler available to the launch-files effect without
  // re-running it — the page recreates `onFileSelection` on every render.
  const onFileSelectionRef = useRef(onFileSelection)
  useEffect(() => {
    onFileSelectionRef.current = onFileSelection
  }, [onFileSelection])

  // Files opened via the PWA "Open with" flow (manifest file_handlers +
  // launchQueue) land in a module-level queue; feed them into the exact same
  // handler as a manual file selection. Covers both orders: files queued
  // before this card mounts (the normal case — the launch routes to /export)
  // and files arriving while the card is already visible.
  useEffect(() => {
    const applyPendingLaunchFiles = () => {
      const files = consumePendingLaunchFiles()
      // The import flow handles one file at a time; the most recently opened
      // file is what the user intends to import.
      const file = files.length > 0 ? files[files.length - 1] : null
      if (file) {
        void onFileSelectionRef.current(file)
      }
    }

    applyPendingLaunchFiles()
    return subscribeToLaunchFiles(applyPendingLaunchFiles)
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mt-2 text-sm font-medium text-ink-soft">
          Importiert `app-data.json`, Teil-JSON-Exporte wie Herden oder Arbeit, den gesamten
          ZIP-Export oder ein separates GeoJSON für Untersuchungsflächen.
        </p>

        <label className="mt-4 block rounded-2xl border-2 border-dashed border-border bg-surface-raised px-4 py-4 text-sm text-ink">
          <div className="font-medium text-ink">Datei wählen</div>
          <div className="mt-1 font-medium text-ink-soft">{selectedFileLabel}</div>
          <input
            type="file"
            accept=".zip,.json,.geojson,application/json,application/geo+json,application/zip"
            className="mt-3 block w-full text-sm"
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
          className="mt-1 h-4 w-4 rounded border-border-soft"
        />
        <span>
          <span className="block font-medium text-ink">Vorhandene Daten vorher löschen</span>
          <span className="block font-medium text-ink-soft">
            Ohne Haken werden Datensätze anhand ihrer `id` ergänzt oder überschrieben.
          </span>
          {importPreview && !canReplaceExisting && (
            <span className="mt-1 block font-medium text-warning-ink">
              Für diese Datei ist `Ersetzen` gesperrt, weil nur Teilmengen importiert werden.
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
