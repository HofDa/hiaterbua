import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db/dexie'
import {
  FIELD_DIAGNOSTICS_LIMIT,
  listFieldDiagnosticsForTests,
  recordFieldDiagnostic,
  recordFieldDiagnosticForTests,
} from '@/lib/diagnostics/field-diagnostics'
import {
  buildFieldDiagnosticsExport,
  serializeFieldDiagnosticsExport,
} from '@/lib/diagnostics/field-diagnostics-export'

async function waitForDiagnosticsCount(minCount: number) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < 2_000) {
    const count = await db.fieldDiagnostics.count()
    if (count >= minCount) return count
    await new Promise((resolve) => setTimeout(resolve, 10))
  }

  return db.fieldDiagnostics.count()
}

beforeEach(async () => {
  await db.fieldDiagnostics.clear()
})

describe('buildFieldDiagnosticsExport', () => {
  it('builds the offline JSON export envelope', () => {
    const diagnostics = [
      {
        id: 'field_diagnostic_1',
        type: 'offline',
        level: 'warning' as const,
        message: 'Browser ist offline gegangen.',
        createdAt: '2026-07-09T08:00:00.000Z',
        online: false,
      },
    ]

    const exportData = buildFieldDiagnosticsExport(diagnostics, {
      exportedAt: '2026-07-09T08:05:00.000Z',
      userAgent: 'test-agent',
    })

    expect(exportData).toMatchObject({
      appName: 'Pastore',
      exportedAt: '2026-07-09T08:05:00.000Z',
      userAgent: 'test-agent',
      diagnostics,
    })
    expect(JSON.parse(serializeFieldDiagnosticsExport(exportData))).toEqual(exportData)
  })
})

describe('recordFieldDiagnostic', () => {
  it('stores a local diagnostic event without requiring network access', async () => {
    recordFieldDiagnostic({
      type: 'offline',
      level: 'warning',
      message: 'Browser ist offline gegangen.',
      details: { source: 'test', latitude: 46.5 },
    })

    await waitForDiagnosticsCount(1)

    const diagnostics = await listFieldDiagnosticsForTests()
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]).toMatchObject({
      type: 'offline',
      level: 'warning',
      message: 'Browser ist offline gegangen.',
      activeWorkSessionId: null,
      activeGrazingSessionId: null,
    })
    expect(diagnostics[0].details).toEqual({ source: 'test' })
  })

  it('keeps only the newest 500 events', async () => {
    const baseTime = Date.parse('2026-07-09T08:00:00.000Z')

    for (let index = 0; index < FIELD_DIAGNOSTICS_LIMIT + 5; index += 1) {
      await recordFieldDiagnosticForTests(
        {
          type: 'test_event',
          message: `Event ${index}`,
        },
        new Date(baseTime + index).toISOString()
      )
    }

    const diagnostics = await listFieldDiagnosticsForTests()
    expect(diagnostics).toHaveLength(FIELD_DIAGNOSTICS_LIMIT)
    expect(diagnostics[0].message).toBe('Event 5')
    expect(diagnostics[diagnostics.length - 1].message).toBe(
      `Event ${FIELD_DIAGNOSTICS_LIMIT + 4}`
    )
  })
})
