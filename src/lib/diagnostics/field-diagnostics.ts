import { db } from '@/lib/db/dexie'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type {
  FieldDiagnosticEvent,
  FieldDiagnosticLevel,
  GrazingSession,
  WorkSession,
} from '@/types/domain'

export const FIELD_DIAGNOSTICS_LIMIT = 500

type RecordFieldDiagnosticInput = {
  type: string
  level?: FieldDiagnosticLevel
  message: string
  activeWorkSessionId?: string | null
  activeGrazingSessionId?: string | null
  activeRecordingId?: string | null
  details?: unknown
}

function getOnlineStatus() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

function getRoute() {
  if (typeof window === 'undefined') return undefined
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

function getUserAgent() {
  return typeof navigator === 'undefined' ? undefined : navigator.userAgent
}

// Also reused by the field-issue report export to re-scrub legacy events.
export function sanitizeDiagnosticDetails(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value
  if (depth > 3) return '[truncated]'

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack?.slice(0, 2_000),
    }
  }

  if (typeof value === 'string') return value.slice(0, 1_000)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeDiagnosticDetails(item, depth + 1))

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !/^(lat|latitude|lon|lng|longitude|coords)$/i.test(key))
        .slice(0, 30)
        .map(([key, item]) => [key, sanitizeDiagnosticDetails(item, depth + 1)])
    )
  }

  return String(value)
}

async function getActiveFieldIds() {
  const [workSession, grazingSession] = await Promise.all([
    db.workSessions
      .where('status')
      .anyOf('active', 'paused')
      .first() as Promise<WorkSession | undefined>,
    db.sessions
      .where('status')
      .anyOf('active', 'paused')
      .first() as Promise<GrazingSession | undefined>,
  ])

  return {
    activeWorkSessionId: workSession?.id ?? null,
    activeGrazingSessionId: grazingSession?.id ?? null,
    activeRecordingId: grazingSession?.id ?? null,
  }
}

async function pruneFieldDiagnostics() {
  const count = await db.fieldDiagnostics.count()
  const excess = count - FIELD_DIAGNOSTICS_LIMIT
  if (excess <= 0) return

  const staleIds = await db.fieldDiagnostics.orderBy('createdAt').limit(excess).primaryKeys()
  if (staleIds.length > 0) {
    await db.fieldDiagnostics.bulkDelete(staleIds.map(String))
  }
}

async function persistFieldDiagnostic(input: RecordFieldDiagnosticInput, createdAt?: string) {
  const timestamp = createdAt ?? nowIso()
  const activeIds = await getActiveFieldIds().catch(() => ({
    activeWorkSessionId: null,
    activeGrazingSessionId: null,
    activeRecordingId: null,
  }))

  const event: FieldDiagnosticEvent = {
    id: createId('field_diagnostic'),
    type: input.type,
    level: input.level ?? 'info',
    message: input.message,
    createdAt: timestamp,
    online: getOnlineStatus(),
    route: getRoute(),
    userAgent: getUserAgent(),
    activeWorkSessionId: input.activeWorkSessionId ?? activeIds.activeWorkSessionId,
    activeGrazingSessionId: input.activeGrazingSessionId ?? activeIds.activeGrazingSessionId,
    activeRecordingId: input.activeRecordingId ?? activeIds.activeRecordingId,
    details: sanitizeDiagnosticDetails(input.details),
  }

  await db.fieldDiagnostics.add(event)
  await pruneFieldDiagnostics()
}

export function recordFieldDiagnostic(input: RecordFieldDiagnosticInput): void {
  void persistFieldDiagnostic(input).catch(() => {
    // Diagnostics must never affect field work.
  })
}

export async function recordFieldDiagnosticForTests(
  input: RecordFieldDiagnosticInput,
  createdAt?: string
) {
  try {
    await persistFieldDiagnostic(input, createdAt)
  } catch {
    // Match production: diagnostics failures are swallowed.
  }
}

export async function listFieldDiagnosticsForTests() {
  return db.fieldDiagnostics.orderBy('createdAt').toArray()
}
