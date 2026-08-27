import { beforeEach, describe, expect, it } from 'vitest'
import { buildCanonicalCareAssessment } from '@/lib/care/care-monitoring-integrity'
import { db } from '@/lib/db/dexie'
import { importPayloadIntoDb } from '@/lib/import-export/export-page-import-helpers'
import {
  getPresentImportPayloadKeys,
  prepareImportPayload,
} from '@/lib/import-export/import-validation'
import type {
  ExistingImportRefs,
  ImportPayload,
  ImportPreviewMeta,
} from '@/lib/import-export/import-validation-types'
import { buildSampleDataset, emptyExistingRefs } from '@/lib/import-export/sample-dataset.fixture'
import type { CareMonitoringCheck } from '@/types/domain'

function clone<T>(value: T): T {
  return structuredClone(value)
}

function metaFor(payload: ImportPayload): ImportPreviewMeta {
  return {
    kind: 'app-data-json',
    presentKeys: getPresentImportPayloadKeys(payload),
    isCompleteAppData: false,
  }
}

function refsForDataset(): ExistingImportRefs {
  const dataset = buildSampleDataset()
  return {
    ...emptyExistingRefs(),
    enclosureIds: new Set(dataset.enclosures.map((record) => record.id)),
    sessionIds: new Set(dataset.sessions.map((record) => record.id)),
    conservationPlanByEnclosureId: new Map(
      dataset.conservationPlans.map((record) => [record.enclosureId, record.id]),
    ),
    conservationPlanEnclosureById: new Map(
      dataset.conservationPlans.map((record) => [record.id, record.enclosureId]),
    ),
  }
}

function validCheck(): CareMonitoringCheck {
  return clone(buildSampleDataset().careMonitoringChecks[0])
}

function prepareCheck(check: CareMonitoringCheck, refs = refsForDataset()) {
  const payload: ImportPayload = { careMonitoringChecks: [check] }
  return prepareImportPayload(payload, metaFor(payload), false, refs)
}

async function seedMonitoringDependencies() {
  const dataset = buildSampleDataset()
  await db.enclosures.bulkPut(dataset.enclosures)
  await db.conservationPlans.bulkPut(dataset.conservationPlans)
  await db.sessions.bulkPut(dataset.sessions)
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

describe('canonical imported assessment', () => {
  it('rejects an incomplete check represented as green', () => {
    const check = validCheck()
    check.observations.vegetationUse = null
    expect(() => prepareCheck(check)).toThrow(/erforderliche Beobachtungen fehlen/)
  })

  it('rejects a wrong status', () => {
    const check = validCheck()
    check.observations.vegetationUse = 'too_low'
    expect(() => prepareCheck(check)).toThrow(/Assessment widerspricht/)
  })

  it('rejects changed findings despite a matching status', () => {
    const check = validCheck()
    check.assessment.findings = [{
      status: 'yellow',
      objective: 'vegetationUse',
      reason: 'Manipuliert',
      actions: ['Manipuliert'],
    }]
    expect(() => prepareCheck(check)).toThrow(/Assessment widerspricht/)
  })

  it('rejects changed actions', () => {
    const check = validCheck()
    check.assessment.actions = ['Manipuliert']
    expect(() => prepareCheck(check)).toThrow(/Assessment widerspricht/)
  })

  it('accepts a canonical assessment and normalizes a missing legacy version to v1', () => {
    const raw = validCheck() as Omit<CareMonitoringCheck, 'assessmentVersion'> & {
      assessmentVersion?: 1
    }
    delete raw.assessmentVersion
    const prepared = prepareCheck(raw as CareMonitoringCheck)
    expect(prepared.payload.careMonitoringChecks[0].assessmentVersion).toBe(1)
  })
})

describe('immutable monitoring collisions in the final transaction', () => {
  it('imports a new ID', async () => {
    await seedMonitoringDependencies()
    const check = validCheck()
    check.id = 'new_check'
    await importPayloadIntoDb(prepareCheck(check))
    await expect(db.careMonitoringChecks.get('new_check')).resolves.toBeDefined()
  })

  it('treats an identical ID as a no-op and preserves local metadata', async () => {
    await seedMonitoringDependencies()
    const local = validCheck()
    local.deviceId = 'local-device'
    await db.careMonitoringChecks.add(local)
    const incoming = validCheck()
    incoming.deviceId = 'backup-device'
    await importPayloadIntoDb(prepareCheck(incoming))
    expect((await db.careMonitoringChecks.get(local.id))?.deviceId).toBe('local-device')
  })

  it.each([
    ['observations', (check: CareMonitoringCheck) => {
      check.observations.vegetationUse = 'too_low'
      check.assessment = buildCanonicalCareAssessment(check.planSnapshot, check.observations)
    }],
    ['assessment', (check: CareMonitoringCheck) => {
      check.assessment.actions = ['Manipuliert']
    }],
    ['planSnapshot', (check: CareMonitoringCheck) => {
      check.planSnapshot.vegetationUse.targetPercent = 50
    }],
    ['observedAt', (check: CareMonitoringCheck) => {
      check.observedAt = '2030-01-01T00:00:00.000Z'
    }],
  ] as const)('rejects the same ID with changed %s', async (_label, mutate) => {
    const prepared = prepareCheck(validCheck())
    await seedMonitoringDependencies()
    await db.careMonitoringChecks.add(validCheck())
    const incoming = prepared.payload.careMonitoringChecks[0]
    mutate(incoming)
    await expect(importPayloadIntoDb(prepared)).rejects.toThrow(/kollidiert|Assessment widerspricht/)
    expect(await db.careMonitoringChecks.get(incoming.id)).toEqual(validCheck())
  })

  it('detects a collision introduced after preview and rolls back every write', async () => {
    const incoming = validCheck()
    incoming.observedAt = '2030-01-01T00:00:00.000Z'
    const payload: ImportPayload = {
      herds: [{ ...buildSampleDataset().herds[0], id: 'must_rollback' }],
      careMonitoringChecks: [incoming],
    }
    const prepared = prepareImportPayload(payload, metaFor(payload), false, refsForDataset())
    await seedMonitoringDependencies()
    await db.careMonitoringChecks.add(validCheck())

    await expect(importPayloadIntoDb(prepared)).rejects.toThrow(/kollidiert/)
    await expect(db.herds.get('must_rollback')).resolves.toBeUndefined()
  })
})

describe('final reference and tombstone validation', () => {
  it('rejects plan reassignment when existing history references the plan', async () => {
    await seedMonitoringDependencies()
    await db.careMonitoringChecks.add(validCheck())
    const reassigned = clone(buildSampleDataset().conservationPlans[0])
    reassigned.enclosureId = 'enclosure_walk'
    const payload: ImportPayload = { conservationPlans: [reassigned] }
    const prepared = prepareImportPayload(payload, metaFor(payload), false, refsForDataset())
    await expect(importPayloadIntoDb(prepared)).rejects.toThrow(/Monitoringhistorie/)
  })

  it('rejects check/plan ownership mismatch', () => {
    const check = validCheck()
    check.enclosureId = 'enclosure_walk'
    expect(() => prepareCheck(check)).toThrow(/gehört nicht zu Pferch/)
  })

  it.each([
    ['Pferch', async () => {
      await db.enclosures.update('enclosure_draw', { deletedAt: '2029-01-01T00:00:00.000Z' })
    }],
    ['Pflegeplan', async () => {
      await db.conservationPlans.update('conservation_plan_1', { deletedAt: '2029-01-01T00:00:00.000Z' })
    }],
    ['Weidegang', async () => {
      await db.sessions.update('session_1', { deletedAt: '2029-01-01T00:00:00.000Z' })
    }],
  ] as const)('rejects a reference to a deleted %s at final write time', async (_label, tombstone) => {
    const check = validCheck()
    check.id = `new_${_label}`
    const prepared = prepareCheck(check)
    await seedMonitoringDependencies()
    await tombstone()
    await expect(importPayloadIntoDb(prepared)).rejects.toThrow(/gelöschten/)
    await expect(db.careMonitoringChecks.get(check.id)).resolves.toBeUndefined()
  })

  it('normalizes missing legacy sync metadata and marks it dirty', async () => {
    await seedMonitoringDependencies()
    const raw = validCheck()
    raw.id = 'legacy_metadata'
    delete raw.deviceId
    delete raw.syncStatus
    delete raw.lastLocalChangeAt
    delete raw.deletedAt
    await importPayloadIntoDb(prepareCheck(raw))
    const stored = await db.careMonitoringChecks.get(raw.id)
    expect(stored).toMatchObject({
      assessmentVersion: 1,
      syncStatus: 'dirty',
      deletedAt: null,
      lastLocalChangeAt: raw.updatedAt,
    })
    expect(stored?.deviceId).toMatch(/^device_/)
  })
})
