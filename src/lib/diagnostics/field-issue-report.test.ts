import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db/dexie'
import {
  buildFieldIssueReport,
  collectFieldIssueReport,
  FIELD_ISSUE_RECENT_EVENT_LIMIT,
  FIELD_ISSUE_RECENT_SESSION_LIMIT,
  FIELD_ISSUE_REPORT_TYPE,
  serializeFieldIssueReport,
  type FieldIssueEnvironment,
} from '@/lib/diagnostics/field-issue-report'
import type { FieldDiagnosticEvent, GrazingSession, TrackPoint } from '@/types/domain'

const testEnvironment: FieldIssueEnvironment = {
  userAgent: 'test-agent',
  language: 'de',
  online: false,
  standaloneDisplayMode: null,
  serviceWorker: {
    supported: true,
    registered: true,
    state: 'activated',
    hasController: true,
    waitingUpdate: false,
    appShellCacheVersion: 'buildid',
  },
  indexedDb: { available: true, error: null },
  persistentStorage: true,
  tileCacheCount: 42,
  storage: { usageBytes: 123_000_000, quotaBytes: 2_000_000_000, usageRatio: 0.0615 },
}

function buildDiagnosticEvent(overrides: Partial<FieldDiagnosticEvent> = {}): FieldDiagnosticEvent {
  return {
    id: `event-${Math.random().toString(36).slice(2)}`,
    type: 'ui_blocker',
    level: 'warning',
    message: 'Blockierendes Element erkannt.',
    createdAt: '2026-07-09T10:00:00.000Z',
    online: false,
    route: '/sessions',
    userAgent: 'test-agent',
    details: { reason: 'dialog' },
    ...overrides,
  }
}

function buildGrazingSession(overrides: Partial<GrazingSession> = {}): GrazingSession {
  return {
    id: `session-${Math.random().toString(36).slice(2)}`,
    herdId: 'herd-1',
    status: 'finished',
    startTime: '2026-07-09T08:00:00.000Z',
    endTime: '2026-07-09T09:00:00.000Z',
    durationS: 3600,
    movingTimeS: 1800,
    distanceM: 2000,
    notes: 'GEHEIME NOTIZ',
    createdAt: '2026-07-09T08:00:00.000Z',
    updatedAt: '2026-07-09T09:00:00.000Z',
    ...overrides,
  } as GrazingSession
}

beforeEach(async () => {
  await Promise.all([
    db.fieldDiagnostics.clear(),
    db.sessions.clear(),
    db.workSessions.clear(),
    db.trackpoints.clear(),
  ])
})

describe('buildFieldIssueReport', () => {
  it('assembles a typed, JSON-serializable support bundle', () => {
    const report = buildFieldIssueReport({
      exportedAt: '2026-07-09T12:00:00.000Z',
      environment: testEnvironment,
      activeGrazingCount: 1,
      activeWorkCount: 0,
      recentSessions: [],
      diagnosticsTotalCount: 3,
      recentDiagnostics: [
        buildDiagnosticEvent({ level: 'error' }),
        buildDiagnosticEvent({ level: 'warning' }),
        buildDiagnosticEvent({ level: 'info' }),
      ],
    })

    expect(report.reportType).toBe(FIELD_ISSUE_REPORT_TYPE)
    expect(report.appVersion).not.toBe('')
    expect(report.environment.tileCacheCount).toBe(42)
    expect(report.diagnostics.countsByLevel).toEqual({ info: 1, warning: 1, error: 1 })
    expect(() => JSON.parse(serializeFieldIssueReport(report))).not.toThrow()
  })

  it('caps recent events and re-scrubs coordinate-shaped detail keys', () => {
    const events = Array.from({ length: 30 }, (_, index) =>
      buildDiagnosticEvent({
        id: `event-${index}`,
        details: { latitude: 46.5, longitude: 11.3, coords: [46.5, 11.3], reason: 'gps' },
      })
    )

    const report = buildFieldIssueReport({
      exportedAt: '2026-07-09T12:00:00.000Z',
      environment: testEnvironment,
      activeGrazingCount: 0,
      activeWorkCount: 0,
      recentSessions: [],
      diagnosticsTotalCount: events.length,
      recentDiagnostics: events,
    })

    expect(report.diagnostics.recentEvents).toHaveLength(FIELD_ISSUE_RECENT_EVENT_LIMIT)

    const serialized = serializeFieldIssueReport(report)
    expect(serialized).not.toMatch(/latitude|longitude|"coords"/)
    expect(serialized).toContain('"reason"')
  })

  it('stays small even with maximum content', () => {
    const events = Array.from({ length: FIELD_ISSUE_RECENT_EVENT_LIMIT }, (_, index) =>
      buildDiagnosticEvent({
        id: `event-${index}`,
        message: 'x'.repeat(500),
        details: { stack: 'y'.repeat(2000) },
      })
    )

    const report = buildFieldIssueReport({
      exportedAt: '2026-07-09T12:00:00.000Z',
      environment: testEnvironment,
      activeGrazingCount: 1,
      activeWorkCount: 1,
      recentSessions: [],
      diagnosticsTotalCount: 500,
      recentDiagnostics: events,
    })

    // Support bundle, not a data export: must stay comfortably mailable.
    expect(serializeFieldIssueReport(report).length).toBeLessThan(200_000)
  })
})

describe('collectFieldIssueReport', () => {
  it('summarizes sessions without names, notes, or trackpoint coordinates', async () => {
    const session = buildGrazingSession({ status: 'active', endTime: null })
    await db.sessions.add(session)
    await db.trackpoints.bulkAdd(
      Array.from({ length: 3 }, (_, index): TrackPoint => ({
        id: `tp-${index}`,
        sessionId: session.id,
        seq: index,
        timestamp: `2026-07-09T08:0${index}:00.000Z`,
        lat: 46.5,
        lon: 11.3,
        accuracyM: 5,
        accepted: true,
      }))
    )
    await db.fieldDiagnostics.add(buildDiagnosticEvent())

    const report = await collectFieldIssueReport()

    expect(report.sessions.activeGrazingCount).toBe(1)
    expect(report.sessions.recent).toHaveLength(1)
    expect(report.sessions.recent[0]).toMatchObject({
      kind: 'grazing',
      id: session.id,
      status: 'active',
      trackpointCount: 3,
    })
    expect(report.diagnostics.totalCount).toBe(1)

    const serialized = serializeFieldIssueReport(report)
    expect(serialized).not.toContain('GEHEIME NOTIZ')
    expect(serialized).not.toContain('46.5')
    expect(serialized).not.toContain('11.3')
    expect(serialized).not.toMatch(/"lat"|"lon"|"latitude"|"longitude"/)
  })

  it('limits the recent session list', async () => {
    await db.sessions.bulkAdd(
      Array.from({ length: 8 }, (_, index) =>
        buildGrazingSession({
          id: `session-${index}`,
          startTime: `2026-07-0${(index % 8) + 1}T08:00:00.000Z`,
        })
      )
    )

    const report = await collectFieldIssueReport()

    expect(report.sessions.recent).toHaveLength(FIELD_ISSUE_RECENT_SESSION_LIMIT)
    // Newest first.
    expect(report.sessions.recent[0].startTime >= report.sessions.recent[1].startTime).toBe(true)
  })

  it('works when browser-only APIs are unavailable (offline/basic environment)', async () => {
    const report = await collectFieldIssueReport()

    expect(report.reportType).toBe(FIELD_ISSUE_REPORT_TYPE)
    expect(report.environment.indexedDb.available).toBe(true)
    expect(report.environment.serviceWorker.supported).toBe(false)
    // navigator.storage.estimate is absent here; export must degrade to null.
    expect(report.environment.storage).toBeNull()
    expect(() => JSON.parse(serializeFieldIssueReport(report))).not.toThrow()
  })
})
