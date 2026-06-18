'use client'

import { ExportHerdCard } from '@/components/export/export-herd-card'
import { ExportImportCard } from '@/components/export/export-import-card'
import { ExportPageHeader } from '@/components/export/export-page-header'
import { ExportWorkCard } from '@/components/export/export-work-card'
import { ExportZipCard } from '@/components/export/export-zip-card'
import { StatusAlert, ErrorAlert } from '@/components/ui/alert'
import { downloadBlob } from '@/lib/import-export/file-formats'
import {
  buildAppExportArchive,
  buildImportPreview,
  buildSingleHerdExportArchive,
  buildWorkSessionsExportArchive,
  canImportPreviewReplaceExisting,
  importPayloadIntoDb,
  prepareDbImportFromPreview,
  type ImportPreview,
} from '@/lib/import-export/export-page-helpers'
import { recordDataBackup } from '@/lib/settings/backup-reminder'
import { useAsyncOperation } from '@/hooks/use-async-operation'
import { useExportPageData } from '@/hooks/use-export-page'

function buildReplaceImportConfirmation(importPreview: ImportPreview) {
  const counts = importPreview.counts
  return [
    'Vorhandene Daten wirklich ersetzen?',
    '',
    'Dieser Import schreibt:',
    `Herden: ${counts.herds}`,
    `Tiere: ${counts.animals}`,
    `Pferche: ${counts.enclosures}`,
    `Untersuchungsflächen: ${counts.surveyAreas}`,
    `Belegungen: ${counts.enclosureAssignments}`,
    `Weidegänge: ${counts.grazingSessions}`,
    `Trackpunkte: ${counts.trackpoints}`,
    `Ereignisse: ${counts.sessionEvents}`,
    `Arbeitseinsätze: ${counts.workSessions}`,
    `Arbeitsereignisse: ${counts.workEvents}`,
    `Settings: ${counts.settings}`,
    '',
    'Diese Aktion kann nicht rückgängig gemacht werden.',
  ].join('\n')
}

export default function ExportPage() {
  const pageData = useExportPageData()
  const exportZip = useAsyncOperation<{ blob: Blob; filename: string }>()
  const exportHerd = useAsyncOperation<{ blob: Blob; filename: string; herdName: string }>()
  const exportWork = useAsyncOperation<{ blob: Blob; filename: string; counts: { workSessions: number; workEvents: number } }>()
  const importData = useAsyncOperation<{
    herds: number
    animals: number
    enclosures: number
    surveyAreas: number
    enclosureAssignments: number
    grazingSessions: number
    trackpoints: number
    sessionEvents: number
    workSessions: number
    workEvents: number
    settings: number
  }>()
  const analyzeImport = useAsyncOperation<ImportPreview>()

  const canReplaceExisting = canImportPreviewReplaceExisting(pageData.importPreview)


  async function handleExportZip() {
    await exportZip.execute(async () => {
      const { blob, filename } = await buildAppExportArchive()
      downloadBlob(blob, filename)
      await recordDataBackup()
      return { blob, filename }
    }, {
      loadingMessage: 'Erstelle ZIP-Export...',
      successMessage: 'ZIP-Export erstellt.'
    })
  }

  async function handleExportSingleHerd() {
    if (!pageData.activeHerdExportId) {
      exportZip.setError('Bitte zuerst eine Herde wählen.')
      return
    }

    await exportHerd.execute(async () => {
      const result = await buildSingleHerdExportArchive(pageData.activeHerdExportId)
      downloadBlob(result.blob, result.filename)
      return result
    }, {
      loadingMessage: 'Erstellt Herden-JSON...',
      successMessage: (result) => `Herde "${result.herdName}" als JSON exportiert.`
    })
  }

  async function handleExportWorkSessions() {
    await exportWork.execute(async () => {
      const result = await buildWorkSessionsExportArchive()
      downloadBlob(result.blob, result.filename)
      return result
    }, {
      loadingMessage: 'Erstelle Arbeitseinsätze-Export...',
      successMessage: (result) => 
        `${result.counts.workSessions} Arbeitseinsätze und ${result.counts.workEvents} Arbeitsereignisse als JSON exportiert.`
    })
  }

  async function handleImport() {
    if (!pageData.selectedFile || !pageData.importPreview) {
      importData.setError('Bitte zuerst eine Importdatei wählen.')
      return
    }

    if (
      pageData.replaceExisting &&
      !window.confirm(buildReplaceImportConfirmation(pageData.importPreview))
    ) {
      return
    }

    await importData.execute(async () => {
      const preparedImport = await prepareDbImportFromPreview(pageData.importPreview!, pageData.replaceExisting)
      const counts = await importPayloadIntoDb(preparedImport)
      return counts
    }, {
      successMessage: (counts) =>
        `Import abgeschlossen (${pageData.replaceExisting ? 'Ersetzen' : 'Zusammenführen'}). Herden: ${counts.herds}, Tiere: ${counts.animals}, Pferche: ${counts.enclosures}, Untersuchungsflächen: ${counts.surveyAreas}, Belegungen: ${counts.enclosureAssignments}, Weidegänge: ${counts.grazingSessions}, Trackpunkte: ${counts.trackpoints}, Ereignisse: ${counts.sessionEvents}, Arbeit: ${counts.workSessions}, Arbeitsereignisse: ${counts.workEvents}, Settings: ${counts.settings}.`
    })
  }

  async function handleFileSelection(file: File | null) {
    pageData.setSelectedFile(file)
    pageData.setImportPreview(null)
    exportZip.reset()
    exportHerd.reset()
    exportWork.reset()
    importData.reset()

    if (!file) {
      return
    }

    await analyzeImport.execute(async () => {
      const preview = await buildImportPreview(file)
      if (pageData.replaceExisting && !canImportPreviewReplaceExisting(preview)) {
        pageData.setReplaceExisting(false)
      }
      pageData.setImportPreview(preview)
      return preview
    }, {
      successMessage: (preview) => `Import-Datei geprüft: ${preview.sourceLabel}.`
    })
  }

  return (
    <div className="space-y-4">
      <ExportPageHeader />

      <ExportZipCard isExporting={exportZip.isLoading} onExportZip={handleExportZip} />

      <ExportHerdCard
        exportableHerds={pageData.exportableHerds}
        activeHerdExportId={pageData.activeHerdExportId}
        isExportingHerd={exportHerd.isLoading}
        onSelectedHerdChange={pageData.setSelectedHerdExportId}
        onExportSingleHerd={handleExportSingleHerd}
      />

      <ExportWorkCard
        workSessionCount={pageData.workSessionCount}
        workEventCount={pageData.workEventCount}
        isExportingWorkSessions={exportWork.isLoading}
        onExportWorkSessions={handleExportWorkSessions}
      />

      <ExportImportCard
        selectedFileLabel={pageData.selectedFileLabel}
        isAnalyzingImport={analyzeImport.isLoading}
        importPreview={pageData.importPreview}
        replaceExisting={pageData.replaceExisting}
        canReplaceExisting={canReplaceExisting}
        canStartImport={Boolean(pageData.selectedFile && pageData.importPreview)}
        isImporting={importData.isLoading}
        onFileSelection={handleFileSelection}
        onReplaceExistingChange={pageData.setReplaceExisting}
        onImport={handleImport}
      />

      {(exportZip.status || exportHerd.status || exportWork.status || importData.status) ? (
        <StatusAlert>
          {exportZip.status || exportHerd.status || exportWork.status || importData.status}
        </StatusAlert>
      ) : null}

      {(exportZip.error || exportHerd.error || exportWork.error || importData.error) ? (
        <ErrorAlert>
          {exportZip.error || exportHerd.error || exportWork.error || importData.error}
        </ErrorAlert>
      ) : null}
    </div>
  )
}
