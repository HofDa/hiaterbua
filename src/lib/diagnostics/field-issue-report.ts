import { db } from '@/lib/db/dexie'
import { sanitizeDiagnosticDetails } from '@/lib/diagnostics/field-diagnostics'
import { APP_NAME, APP_VERSION } from '@/lib/app-metadata'
import { getPersistentStorageStatus, getTileCacheCount } from '@/lib/maps/tile-cache'
import { getStorageEstimate } from '@/lib/utils/storage-health'
import type { FieldDiagnosticEvent, FieldDiagnosticLevel } from '@/types/domain'

export const FIELD_ISSUE_REPORT_TYPE = 'pastore-field-issue-report'
export const FIELD_ISSUE_RECENT_EVENT_LIMIT = 20
export const FIELD_ISSUE_RECENT_SESSION_LIMIT = 5

export type FieldIssueServiceWorkerStatus = {
  supported: boolean
  registered: boolean
  state: string | null
  hasController: boolean
  waitingUpdate: boolean
  appShellCacheVersion: string | null
}

export type FieldIssueStorageUsage = {
  usageBytes: number
  quotaBytes: number
  usageRatio: number
}

export type FieldIssueEnvironment = {
  userAgent: string
  language: string | null
  online: boolean
  standaloneDisplayMode: boolean | null
  serviceWorker: FieldIssueServiceWorkerStatus
  indexedDb: { available: boolean; error: string | null }
  persistentStorage: boolean | null
  tileCacheCount: number | null
  // null when navigator.storage.estimate is unavailable (private mode, older WebKit).
  storage: FieldIssueStorageUsage | null
}

// Deliberately id/aggregate-only: no names, notes, or coordinates. Aggregates
// like distance/duration are field metrics, not positions.
export type FieldIssueSessionSummary = {
  kind: 'grazing' | 'work'
  id: string
  status: string
  startTime: string
  endTime: string | null
  durationS: number
  trackpointCount: number | null
  updatedAt: string | null
}

export type FieldIssueRecentEvent = {
  id: string
  type: string
  level: FieldDiagnosticLevel
  message: string
  createdAt: string
  online: boolean
  route: string | null
  details: unknown
}

export type FieldIssueReport = {
  reportType: typeof FIELD_ISSUE_REPORT_TYPE
  appName: string
  appVersion: string
  exportedAt: string
  environment: FieldIssueEnvironment
  sessions: {
    activeGrazingCount: number
    activeWorkCount: number
    recent: FieldIssueSessionSummary[]
  }
  diagnostics: {
    totalCount: number
    countsByLevel: Record<FieldDiagnosticLevel, number>
    recentEvents: FieldIssueRecentEvent[]
  }
}

type BuildFieldIssueReportInput = {
  exportedAt: string
  environment: FieldIssueEnvironment
  activeGrazingCount: number
  activeWorkCount: number
  recentSessions: FieldIssueSessionSummary[]
  diagnosticsTotalCount: number
  recentDiagnostics: FieldDiagnosticEvent[]
}

// Pure assembly step, unit-testable without browser APIs. Re-scrubs event
// details so even legacy events recorded before sanitizing existed cannot
// leak coordinates into a support bundle.
export function buildFieldIssueReport(input: BuildFieldIssueReportInput): FieldIssueReport {
  const countsByLevel: Record<FieldDiagnosticLevel, number> = {
    info: 0,
    warning: 0,
    error: 0,
  }

  const recentEvents = input.recentDiagnostics
    .slice(0, FIELD_ISSUE_RECENT_EVENT_LIMIT)
    .map((event) => ({
      id: event.id,
      type: event.type,
      level: event.level,
      message: event.message,
      createdAt: event.createdAt,
      online: event.online,
      route: event.route ?? null,
      details: sanitizeDiagnosticDetails(event.details),
    }))

  for (const event of input.recentDiagnostics) {
    countsByLevel[event.level] = (countsByLevel[event.level] ?? 0) + 1
  }

  return {
    reportType: FIELD_ISSUE_REPORT_TYPE,
    appName: APP_NAME,
    appVersion: APP_VERSION,
    exportedAt: input.exportedAt,
    environment: input.environment,
    sessions: {
      activeGrazingCount: input.activeGrazingCount,
      activeWorkCount: input.activeWorkCount,
      recent: input.recentSessions.slice(0, FIELD_ISSUE_RECENT_SESSION_LIMIT),
    },
    diagnostics: {
      totalCount: input.diagnosticsTotalCount,
      countsByLevel,
      recentEvents,
    },
  }
}

export function serializeFieldIssueReport(report: FieldIssueReport) {
  return JSON.stringify(report, null, 2)
}

async function getServiceWorkerStatus(): Promise<FieldIssueServiceWorkerStatus> {
  const unsupported: FieldIssueServiceWorkerStatus = {
    supported: false,
    registered: false,
    state: null,
    hasController: false,
    waitingUpdate: false,
    appShellCacheVersion: null,
  }

  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return unsupported
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    const worker = registration?.active ?? registration?.installing ?? registration?.waiting ?? null

    let appShellCacheVersion: string | null = null
    if (typeof caches !== 'undefined') {
      try {
        const cacheNames = await caches.keys()
        const appShellName = cacheNames.find((name) => name.startsWith('pastore-app-shell-'))
        appShellCacheVersion = appShellName?.slice('pastore-app-shell-'.length) ?? null
      } catch {
        appShellCacheVersion = null
      }
    }

    return {
      supported: true,
      registered: Boolean(registration),
      state: worker?.state ?? null,
      hasController: Boolean(navigator.serviceWorker.controller),
      waitingUpdate: Boolean(registration?.waiting),
      appShellCacheVersion,
    }
  } catch {
    return { ...unsupported, supported: true }
  }
}

async function getIndexedDbStatus(): Promise<{ available: boolean; error: string | null }> {
  if (typeof indexedDB === 'undefined') {
    return { available: false, error: 'indexedDB fehlt in diesem Browser.' }
  }

  try {
    await db.fieldDiagnostics.limit(1).toArray()
    return { available: true, error: null }
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300),
    }
  }
}

async function getRecentSessionSummaries(): Promise<{
  activeGrazingCount: number
  activeWorkCount: number
  recent: FieldIssueSessionSummary[]
}> {
  const [grazingSessions, workSessions, activeGrazingCount, activeWorkCount] = await Promise.all([
    db.sessions.orderBy('startTime').reverse().limit(FIELD_ISSUE_RECENT_SESSION_LIMIT).toArray(),
    db.workSessions.orderBy('startTime').reverse().limit(FIELD_ISSUE_RECENT_SESSION_LIMIT).toArray(),
    db.sessions.where('status').anyOf('active', 'paused').count(),
    db.workSessions.where('status').anyOf('active', 'paused').count(),
  ])

  const grazingSummaries = await Promise.all(
    grazingSessions.map(async (session): Promise<FieldIssueSessionSummary> => {
      const trackpointCount = await db.trackpoints
        .where('sessionId')
        .equals(session.id)
        .count()
        .catch(() => null)

      return {
        kind: 'grazing',
        id: session.id,
        status: session.status,
        startTime: session.startTime,
        endTime: session.endTime ?? null,
        durationS: session.durationS,
        trackpointCount,
        updatedAt: session.lastLocalChangeAt ?? null,
      }
    })
  )

  const workSummaries = workSessions.map(
    (session): FieldIssueSessionSummary => ({
      kind: 'work',
      id: session.id,
      status: session.status,
      startTime: session.startTime,
      endTime: session.endTime ?? null,
      durationS: session.durationS,
      trackpointCount: null,
      updatedAt: session.lastLocalChangeAt ?? null,
    })
  )

  const recent = [...grazingSummaries, ...workSummaries]
    .sort((left, right) => right.startTime.localeCompare(left.startTime))
    .slice(0, FIELD_ISSUE_RECENT_SESSION_LIMIT)

  return { activeGrazingCount, activeWorkCount, recent }
}

// Gathers the full support bundle. Every probe degrades to a null/error field
// instead of throwing so the export also works on a badly broken device —
// that is exactly when a tester needs it.
export async function collectFieldIssueReport(): Promise<FieldIssueReport> {
  const exportedAt = new Date().toISOString()
  const indexedDb = await getIndexedDbStatus()

  const [serviceWorker, persistentStorage, tileCacheCount, storageEstimate] = await Promise.all([
    getServiceWorkerStatus(),
    getPersistentStorageStatus().catch(() => null),
    getTileCacheCount().catch(() => null),
    // getStorageEstimate already resolves to null on missing/rejecting API.
    getStorageEstimate().catch(() => null),
  ])

  let sessions: Awaited<ReturnType<typeof getRecentSessionSummaries>> = {
    activeGrazingCount: 0,
    activeWorkCount: 0,
    recent: [],
  }
  let diagnosticsTotalCount = 0
  let recentDiagnostics: FieldDiagnosticEvent[] = []

  if (indexedDb.available) {
    sessions = await getRecentSessionSummaries().catch(() => sessions)
    diagnosticsTotalCount = await db.fieldDiagnostics.count().catch(() => 0)
    recentDiagnostics = await db.fieldDiagnostics
      .orderBy('createdAt')
      .reverse()
      .limit(FIELD_ISSUE_RECENT_EVENT_LIMIT)
      .toArray()
      .catch(() => [])
  }

  return buildFieldIssueReport({
    exportedAt,
    environment: {
      userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
      language: typeof navigator === 'undefined' ? null : navigator.language ?? null,
      online: typeof navigator === 'undefined' ? true : navigator.onLine,
      standaloneDisplayMode:
        typeof window !== 'undefined' && typeof window.matchMedia === 'function'
          ? window.matchMedia('(display-mode: standalone)').matches
          : null,
      serviceWorker,
      indexedDb,
      persistentStorage,
      tileCacheCount,
      storage: storageEstimate
        ? {
            usageBytes: storageEstimate.usage,
            quotaBytes: storageEstimate.quota,
            usageRatio: storageEstimate.ratio,
          }
        : null,
    },
    activeGrazingCount: sessions.activeGrazingCount,
    activeWorkCount: sessions.activeWorkCount,
    recentSessions: sessions.recent,
    diagnosticsTotalCount,
    recentDiagnostics,
  })
}
