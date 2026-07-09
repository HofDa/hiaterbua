'use client'

import { ExportHerdCard } from '@/components/export/export-herd-card'
import { ExportImportCard } from '@/components/export/export-import-card'
import { ExportPageHeader } from '@/components/export/export-page-header'
import { ExportWorkCard } from '@/components/export/export-work-card'
import { ExportZipCard } from '@/components/export/export-zip-card'
import { StatusAlert, ErrorAlert } from '@/components/ui/alert'
import { useConfirm } from '@/components/ui/confirm-dialog'
import {
  downloadBlob,
  shareOrDownloadBlob,
  type ShareBlobOutcome,
} from '@/lib/import-export/file-formats'
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
import { useCanShareFiles } from '@/hooks/use-can-share-files'
import { useExportPageData } from '@/hooks/use-export-page'

type ExportDelivery = 'download' | 'share'

async function deliverExportBlob(
  mode: ExportDelivery,
  blob: Blob,
  filename: string,
  shareTitle: string,
): Promise<ShareBlobOutcome> {
  if (mode === 'share') {
    return shareOrDownloadBlob(blob, filename, shareTitle)
  }

  downloadBlob(blob, filename)
  return 'downloaded'
}

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
  const confirm = useConfirm()
  const pageData = useExportPageData()
  const canShareFiles = useCanShareFiles()
  const exportZip = useAsyncOperation<{ outcome: ShareBlobOutcome }>()
  const exportHerd = useAsyncOperation<{ outcome: ShareBlobOutcome; herdName: string }>()
  const exportWork = useAsyncOperation<{ outcome: ShareBlobOutcome; counts: { workSessions: number; workEvents: number } }>()
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


  async function handleExportZip(mode: ExportDelivery = 'download') {
    await exportZip.execute(async () => {
      const { blob, filename } = await buildAppExportArchive()
      const outcome = await deliverExportBlob(mode, blob, filename, 'ZIP-Export')
      if (outcome !== 'cancelled') {
        await recordDataBackup()
      }
      return { outcome }
    }, {
      loadingMessage: 'Erstelle ZIP-Export...',
      successMessage: (result) =>
        result.outcome === 'cancelled'
          ? ''
          : result.outcome === 'shared'
            ? 'ZIP-Export geteilt.'
            : 'ZIP-Export erstellt.'
    })
  }

  async function handleExportSingleHerd(mode: ExportDelivery = 'download') {
    if (!pageData.activeHerdExportId) {
      exportZip.setError('Bitte zuerst eine Herde wählen.')
      return
    }

    await exportHerd.execute(async () => {
      const result = await buildSingleHerdExportArchive(pageData.activeHerdExportId)
      const outcome = await deliverExportBlob(
        mode,
        result.blob,
        result.filename,
        `Herde ${result.herdName}`,
      )
      return { outcome, herdName: result.herdName }
    }, {
      loadingMessage: 'Erstellt Herden-JSON...',
      successMessage: (result) =>
        result.outcome === 'cancelled'
          ? ''
          : result.outcome === 'shared'
            ? `Herde "${result.herdName}" als JSON geteilt.`
            : `Herde "${result.herdName}" als JSON exportiert.`
    })
  }

  async function handleExportWorkSessions(mode: ExportDelivery = 'download') {
    await exportWork.execute(async () => {
      const result = await buildWorkSessionsExportArchive()
      const outcome = await deliverExportBlob(
        mode,
        result.blob,
        result.filename,
        'Arbeitseinsätze',
      )
      return { outcome, counts: result.counts }
    }, {
      loadingMessage: 'Erstelle Arbeitseinsätze-Export...',
      successMessage: (result) =>
        result.outcome === 'cancelled'
          ? ''
          : `${result.counts.workSessions} Arbeitseinsätze und ${result.counts.workEvents} Arbeitsereignisse als JSON ${result.outcome === 'shared' ? 'geteilt' : 'exportiert'}.`
    })
  }

  async function handleImport() {
    if (!pageData.selectedFile || !pageData.importPreview) {
      importData.setError('Bitte zuerst eine Importdatei wählen.')
      return
    }

    if (pageData.replaceExisting) {
      const confirmed = await confirm({
        title: 'Import bestätigen',
        description: (
          <span className="whitespace-pre-line">
            {buildReplaceImportConfirmation(pageData.importPreview)}
          </span>
        ),
        confirmLabel: 'Ersetzen',
        destructive: true,
      })

      if (!confirmed) return
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

      <ExportZipCard
        isExporting={exportZip.isLoading}
        canShare={canShareFiles}
        onExportZip={() => handleExportZip('download')}
        onShareZip={() => handleExportZip('share')}
      />

      <ExportHerdCard
        exportableHerds={pageData.exportableHerds}
        activeHerdExportId={pageData.activeHerdExportId}
        isExportingHerd={exportHerd.isLoading}
        canShare={canShareFiles}
        onSelectedHerdChange={pageData.setSelectedHerdExportId}
        onExportSingleHerd={() => handleExportSingleHerd('download')}
        onShareSingleHerd={() => handleExportSingleHerd('share')}
      />

      <ExportWorkCard
        workSessionCount={pageData.workSessionCount}
        workEventCount={pageData.workEventCount}
        isExportingWorkSessions={exportWork.isLoading}
        canShare={canShareFiles}
        onExportWorkSessions={() => handleExportWorkSessions('download')}
        onShareWorkSessions={() => handleExportWorkSessions('share')}
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
