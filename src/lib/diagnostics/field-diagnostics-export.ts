import { APP_NAME } from '@/lib/app-metadata'
import type { FieldDiagnosticEvent } from '@/types/domain'

export type FieldDiagnosticsExport = {
  appName: string
  exportedAt: string
  userAgent: string
  diagnostics: FieldDiagnosticEvent[]
}

export function buildFieldDiagnosticsExport(
  diagnostics: FieldDiagnosticEvent[],
  options: {
    exportedAt?: string
    userAgent?: string
  } = {}
): FieldDiagnosticsExport {
  return {
    appName: APP_NAME,
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    userAgent:
      options.userAgent ??
      (typeof navigator === 'undefined' ? '' : navigator.userAgent),
    diagnostics,
  }
}

export function serializeFieldDiagnosticsExport(exportData: FieldDiagnosticsExport) {
  return JSON.stringify(exportData, null, 2)
}

