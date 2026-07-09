'use client'

import { Copy, Download, LifeBuoy, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/dexie'
import {
  buildFieldDiagnosticsExport,
  serializeFieldDiagnosticsExport,
} from '@/lib/diagnostics/field-diagnostics-export'
import {
  collectFieldIssueReport,
  serializeFieldIssueReport,
} from '@/lib/diagnostics/field-issue-report'
import {
  DEBUG_FIELD_DIAGNOSTICS_CHANGED_EVENT,
  DEBUG_FIELD_DIAGNOSTICS_STORAGE_KEY,
  isDebugFieldDiagnosticsEnabled,
  setDebugFieldDiagnosticsEnabled,
} from '@/lib/diagnostics/ui-blocker-detector'
import { downloadBlob } from '@/lib/import-export/file-formats'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { ErrorAlert, StatusAlert } from '@/components/ui/alert'
import { cn } from '@/lib/utils/cn'
import type { FieldDiagnosticEvent } from '@/types/domain'

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('de', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value))
}

function formatDetails(details: unknown) {
  if (details === undefined || details === null) return ''

  try {
    return JSON.stringify(details, null, 2)
  } catch {
    return String(details)
  }
}

function buildExportJson(diagnostics: FieldDiagnosticEvent[]) {
  return serializeFieldDiagnosticsExport(buildFieldDiagnosticsExport(diagnostics))
}

export default function DiagnosticsPage() {
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [debugFieldDiagnostics, setDebugFieldDiagnostics] = useState(false)
  const diagnostics = useLiveQuery(
    () => db.fieldDiagnostics.orderBy('createdAt').reverse().toArray(),
    []
  )
  const safeDiagnostics = useMemo(() => diagnostics ?? [], [diagnostics])
  const exportJson = useMemo(() => buildExportJson(safeDiagnostics), [safeDiagnostics])

  useEffect(() => {
    const updateDebugState = () => {
      setDebugFieldDiagnostics(isDebugFieldDiagnosticsEnabled())
    }

    updateDebugState()
    window.addEventListener(DEBUG_FIELD_DIAGNOSTICS_CHANGED_EVENT, updateDebugState)

    return () => {
      window.removeEventListener(DEBUG_FIELD_DIAGNOSTICS_CHANGED_EVENT, updateDebugState)
    }
  }, [])

  async function copyDiagnostics() {
    setStatus('')
    setError('')

    if (!navigator.clipboard?.writeText) {
      setError('Zwischenablage wird von diesem Browser nicht unterstützt.')
      return
    }

    try {
      await navigator.clipboard.writeText(exportJson)
      setStatus('Diagnose in die Zwischenablage kopiert.')
    } catch {
      setError('Diagnose konnte nicht kopiert werden.')
    }
  }

  function exportDiagnostics() {
    setStatus('')
    setError('')

    const exportedAt = new Date().toISOString()
    const blob = new Blob([serializeFieldDiagnosticsExport(
      buildFieldDiagnosticsExport(safeDiagnostics, { exportedAt })
    )], {
      type: 'application/json',
    })

    downloadBlob(blob, `pastore-diagnose-${exportedAt.slice(0, 10)}.json`)
    setStatus('Diagnose exportiert.')
  }

  async function exportFieldIssueBundle() {
    setStatus('')
    setError('')

    try {
      const report = await collectFieldIssueReport()
      const blob = new Blob([serializeFieldIssueReport(report)], {
        type: 'application/json',
      })

      downloadBlob(blob, `pastore-feldproblem-${report.exportedAt.slice(0, 10)}.json`)
      setStatus('Feldproblem-Bericht exportiert. Datei an die Entwickler senden.')
    } catch {
      setError('Feldproblem-Bericht konnte nicht erstellt werden.')
    }
  }

  async function clearDiagnostics() {
    setStatus('')
    setError('')

    try {
      await db.fieldDiagnostics.clear()
      setStatus('Diagnose gelöscht.')
    } catch {
      setError('Diagnose konnte nicht gelöscht werden.')
    }
  }

  function toggleDebugFieldDiagnostics(enabled: boolean) {
    setDebugFieldDiagnosticsEnabled(enabled)
    setDebugFieldDiagnostics(isDebugFieldDiagnosticsEnabled())
    setStatus(
      enabled
        ? 'UI-Blocker-Erkennung aktiviert.'
        : 'UI-Blocker-Erkennung deaktiviert.'
    )
    setError('')
  }

  return (
    <div className="space-y-4">
      <section className="app-panel p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-2xl">Feld-Diagnose</CardTitle>
            <CardDescription className="mt-2 max-w-2xl">
              Lokale Debug-Ereignisse für fehlgeschlagene Feldtests. Diese Daten bleiben auf
              diesem Gerät und funktionieren offline.
            </CardDescription>
          </div>
          <Link href="/settings" className={cn(buttonVariants({ variant: 'secondary' }), 'rounded-full')}>
            Einstellungen
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void exportFieldIssueBundle()}
            className={cn(buttonVariants({ variant: 'default' }), 'gap-2 rounded-full')}
          >
            <LifeBuoy aria-hidden="true" className="h-4 w-4" />
            Feldproblem exportieren
          </button>
          <button
            type="button"
            onClick={() => void copyDiagnostics()}
            disabled={safeDiagnostics.length === 0}
            className={cn(buttonVariants({ variant: 'secondary' }), 'gap-2 rounded-full')}
          >
            <Copy aria-hidden="true" className="h-4 w-4" />
            Diagnose kopieren
          </button>
          <button
            type="button"
            onClick={exportDiagnostics}
            disabled={safeDiagnostics.length === 0}
            className={cn(buttonVariants({ variant: 'secondary' }), 'gap-2 rounded-full')}
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            Diagnose exportieren
          </button>
          <button
            type="button"
            onClick={() => void clearDiagnostics()}
            disabled={safeDiagnostics.length === 0}
            className={cn(buttonVariants({ variant: 'outline' }), 'gap-2 rounded-full text-error-ink')}
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Diagnose löschen
          </button>
        </div>

        <label className="mt-4 flex items-start gap-3 rounded-[1rem] border border-border bg-surface-raised px-4 py-3">
          <input
            type="checkbox"
            checked={debugFieldDiagnostics}
            onChange={(event) => toggleDebugFieldDiagnostics(event.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink-strong">
              UI-Blocker-Erkennung bei aktiver Feldarbeit
            </span>
            <span className="mt-1 block text-sm font-medium text-ink-muted">
              Lokale Debug-Einstellung <code>{DEBUG_FIELD_DIAGNOSTICS_STORAGE_KEY}</code>.
              Aktiviert auch automatisch in Entwicklung oder mit <code>?debugField=1</code>.
            </span>
          </span>
        </label>
      </section>

      {status ? <StatusAlert variant="info">{status}</StatusAlert> : null}
      {error ? <ErrorAlert>{error}</ErrorAlert> : null}

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-ink-strong">
              Neueste Ereignisse
            </h2>
            <span className="rounded-full bg-surface-raised px-3 py-1 text-sm font-semibold text-ink-muted">
              {safeDiagnostics.length} Einträge
            </span>
          </div>

          {diagnostics === undefined ? (
            <p className="rounded-[1rem] bg-surface-raised px-4 py-3 text-sm font-medium text-ink-muted">
              Diagnose wird geladen ...
            </p>
          ) : safeDiagnostics.length === 0 ? (
            <p className="rounded-[1rem] bg-surface-raised px-4 py-3 text-sm font-medium text-ink-muted">
              Noch keine Diagnose-Ereignisse gespeichert.
            </p>
          ) : (
            <div className="space-y-2">
              {safeDiagnostics.map((event) => {
                const details = formatDetails(event.details)

                return (
                  <article
                    key={event.id}
                    className="rounded-[1rem] border border-border bg-surface-raised p-3"
                  >
                    <div className="grid gap-2 md:grid-cols-[10rem_1fr]">
                      <time className="text-sm font-semibold text-ink-muted">
                        {formatDateTime(event.createdAt)}
                      </time>
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-surface px-2.5 py-1 font-mono text-xs font-semibold text-ink-strong">
                            {event.type}
                          </span>
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 text-xs font-semibold',
                              event.level === 'error'
                                ? 'bg-error-surface text-error-ink'
                                : event.level === 'warning'
                                  ? 'bg-warning-surface text-warning-ink'
                                  : 'bg-info-surface text-info-ink'
                            )}
                          >
                            {event.level}
                          </span>
                          <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-ink-muted">
                            {event.online ? 'online' : 'offline'}
                          </span>
                        </div>
                        {event.route ? (
                          <p className="break-all font-mono text-xs text-ink-muted">
                            {event.route}
                          </p>
                        ) : null}
                        <p className="text-sm font-medium text-ink-strong">{event.message}</p>
                        {details ? (
                          <details className="rounded-[0.9rem] bg-surface px-3 py-2">
                            <summary className="cursor-pointer text-sm font-semibold text-ink-muted">
                              Details
                            </summary>
                            <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs text-ink">
                              {details}
                            </pre>
                          </details>
                        ) : null}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
