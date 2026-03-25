import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/dexie'
import type { ImportPreview } from '@/lib/import-export/export-page-helpers'

export function useExportPageData() {
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingHerd, setIsExportingHerd] = useState(false)
  const [isExportingWorkSessions, setIsExportingWorkSessions] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [replaceExisting, setReplaceExisting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedHerdExportId, setSelectedHerdExportId] = useState('')
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [isAnalyzingImport, setIsAnalyzingImport] = useState(false)

  const dashboardData = useLiveQuery(async () => {
    const [herdList, nextWorkSessionCount, nextWorkEventCount] = await Promise.all([
      db.herds.orderBy('name').toArray(),
      db.workSessions.count(),
      db.workEvents.count(),
    ])

    return {
      exportableHerds: herdList,
      workSessionCount: nextWorkSessionCount,
      workEventCount: nextWorkEventCount,
    }
  }, [])

  const exportableHerds = dashboardData?.exportableHerds ?? null
  const workSessionCount = dashboardData?.workSessionCount ?? null
  const workEventCount = dashboardData?.workEventCount ?? null

  const selectedFileLabel = useMemo(() => {
    if (!selectedFile) return 'Keine Datei gewählt.'
    return `${selectedFile.name} (${Math.round(selectedFile.size / 1024)} KB)`
  }, [selectedFile])

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

    async function refreshData() {
      await Promise.all([
        db.herds.orderBy('name').toArray(),
        db.workSessions.count(),
        db.workEvents.count(),
      ])

      if (!cancelled) {
        // This will trigger a re-render through the live query
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshData()
      }
    }

    window.addEventListener('focus', refreshData)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      window.removeEventListener('focus', refreshData)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return {
    // State
    isExporting,
    isExportingHerd,
    isExportingWorkSessions,
    isImporting,
    status,
    error,
    replaceExisting,
    selectedFile,
    selectedHerdExportId,
    importPreview,
    isAnalyzingImport,
    
    // Data
    exportableHerds,
    workSessionCount,
    workEventCount,
    selectedFileLabel,
    activeHerdExportId,
    
    // Actions
    setIsExporting,
    setIsExportingHerd,
    setIsExportingWorkSessions,
    setIsImporting,
    setStatus,
    setError,
    setReplaceExisting,
    setSelectedFile,
    setSelectedHerdExportId,
    setImportPreview,
    setIsAnalyzingImport,
  }
}
