'use client'

import { useEffect, useMemo, useState } from 'react'
import { ExportHerdCard } from '@/components/export/export-herd-card'
import { ExportImportCard } from '@/components/export/export-import-card'
import { ExportPageHeader } from '@/components/export/export-page-header'
import { ExportWorkCard } from '@/components/export/export-work-card'
import { ExportZipCard } from '@/components/export/export-zip-card'
import { db } from '@/lib/db/dexie'
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
import type { Herd } from '@/types/domain'

export default function ExportPage() {
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingHerd, setIsExportingHerd] = useState(false)
  const [isExportingWorkSessions, setIsExportingWorkSessions] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [exportableHerds, setExportableHerds] = useState<Herd[] | null>(null)
  const [workSessionCount, setWorkSessionCount] = useState<number | null>(null)
  const [workEventCount, setWorkEventCount] = useState<number | null>(null)
  const [replaceExisting, setReplaceExisting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedHerdExportId, setSelectedHerdExportId] = useState('')
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [isAnalyzingImport, setIsAnalyzingImport] = useState(false)

  const selectedFileLabel = useMemo(() => {
    if (!selectedFile) return 'Keine Datei gewählt.'
    return `${selectedFile.name} (${Math.round(selectedFile.size / 1024)} KB)`
  }, [selectedFile])

  const canReplaceExisting = useMemo(
    () => canImportPreviewReplaceExisting(importPreview),
    [importPreview]
  )

  const activeHerdExportId = useMemo(() => {
    if (!exportableHerds || exportableHerds.length === 0) {
      return ''
    }

    if (selectedHerdExportId && exportableHerds.some((herd) => herd.id === selectedHerdExportId)) {
      return selectedHerdExportId
    }

    return exportableHerds[0].id
  }, [exportableHerds, selectedHerdExportId])

  useEffect(() => {
    let cancelled = false

    async function loadExportData() {
      const [herdList, nextWorkSessionCount, nextWorkEventCount] = await Promise.all([
        db.herds.orderBy('name').toArray(),
        db.workSessions.count(),
        db.workEvents.count(),
      ])

      if (!cancelled) {
        setExportableHerds(herdList)
        setWorkSessionCount(nextWorkSessionCount)
        setWorkEventCount(nextWorkEventCount)
      }
    }

    void loadExportData()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadExportData()
      }
    }

    window.addEventListener('focus', loadExportData)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      window.removeEventListener('focus', loadExportData)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  async function handleExportZip() {
    setIsExporting(true)
    setStatus('')
    setError('')

    try {
      const { blob, filename } = await buildAppExportArchive()
      downloadBlob(blob, filename)
      setStatus('ZIP-Export erstellt.')
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Export konnte nicht erstellt werden.'
      )
    } finally {
      setIsExporting(false)
    }
  }

  async function handleExportSingleHerd() {
    if (!activeHerdExportId) {
      setError('Bitte zuerst eine Herde wählen.')
      return
    }

    setIsExportingHerd(true)
    setStatus('')
    setError('')

    try {
      const { blob, filename, herdName } = await buildSingleHerdExportArchive(activeHerdExportId)
      downloadBlob(blob, filename)
      setStatus(`Herde "${herdName}" als JSON exportiert.`)
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Herde konnte nicht exportiert werden.'
      )
    } finally {
      setIsExportingHerd(false)
    }
  }

  async function handleExportWorkSessions() {
    setIsExportingWorkSessions(true)
    setStatus('')
    setError('')

    try {
      const { blob, filename, counts } = await buildWorkSessionsExportArchive()
      downloadBlob(blob, filename)
      setStatus(
        `${counts.workSessions} Arbeitseinsätze und ${counts.workEvents} Arbeitsereignisse als JSON exportiert.`
      )
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Arbeitseinsätze konnten nicht exportiert werden.'
      )
    } finally {
      setIsExportingWorkSessions(false)
    }
  }

  async function handleImport() {
    if (!selectedFile || !importPreview) {
      setError('Bitte zuerst eine Importdatei wählen.')
      return
    }

    setIsImporting(true)
    setStatus('')
    setError('')

    try {
      const preparedImport = await prepareDbImportFromPreview(importPreview, replaceExisting)
      const counts = await importPayloadIntoDb(preparedImport)
      setStatus(
        `Import abgeschlossen (${replaceExisting ? 'Ersetzen' : 'Zusammenführen'}). Herden: ${counts.herds}, Tiere: ${counts.animals}, Pferche: ${counts.enclosures}, Untersuchungsflächen: ${counts.surveyAreas}, Belegungen: ${counts.enclosureAssignments}, Weidegänge: ${counts.grazingSessions}, Trackpunkte: ${counts.trackpoints}, Ereignisse: ${counts.sessionEvents}, Arbeit: ${counts.workSessions}, Arbeitsereignisse: ${counts.workEvents}, Settings: ${counts.settings}.`
      )
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Import konnte nicht durchgeführt werden.'
      )
    } finally {
      setIsImporting(false)
    }
  }

  async function handleFileSelection(file: File | null) {
    setSelectedFile(file)
    setImportPreview(null)
    setStatus('')
    setError('')

    if (!file) {
      return
    }

    setIsAnalyzingImport(true)

    try {
      const preview = await buildImportPreview(file)
      if (replaceExisting && !canImportPreviewReplaceExisting(preview)) {
        setReplaceExisting(false)
      }
      setImportPreview(preview)
      setStatus(`Import-Datei geprüft: ${preview.sourceLabel}.`)
    } catch (currentError) {
      setImportPreview(null)
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Datei konnte nicht analysiert werden.'
      )
    } finally {
      setIsAnalyzingImport(false)
    }
  }

  return (
    <div className="space-y-4">
      <ExportPageHeader />

      <ExportZipCard isExporting={isExporting} onExportZip={handleExportZip} />

      <ExportHerdCard
        exportableHerds={exportableHerds}
        activeHerdExportId={activeHerdExportId}
        isExportingHerd={isExportingHerd}
        onSelectedHerdChange={setSelectedHerdExportId}
        onExportSingleHerd={handleExportSingleHerd}
      />

      <ExportWorkCard
        workSessionCount={workSessionCount}
        workEventCount={workEventCount}
        isExportingWorkSessions={isExportingWorkSessions}
        onExportWorkSessions={handleExportWorkSessions}
      />

      <ExportImportCard
        selectedFileLabel={selectedFileLabel}
        isAnalyzingImport={isAnalyzingImport}
        importPreview={importPreview}
        replaceExisting={replaceExisting}
        canReplaceExisting={canReplaceExisting}
        canStartImport={Boolean(selectedFile && importPreview)}
        isImporting={isImporting}
        onFileSelection={handleFileSelection}
        onReplaceExistingChange={setReplaceExisting}
        onImport={handleImport}
      />

      {status ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-900">
          {status}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-300 bg-red-100 px-4 py-3 text-sm font-semibold text-red-900">
          {error}
        </div>
      ) : null}
    </div>
  )
}
