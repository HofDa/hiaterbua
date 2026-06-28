import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db/dexie'
import { buildAppExportArtifacts } from '@/lib/import-export/export-page-app-archive-builders'
import {
  importPayloadIntoDb,
  prepareDbImportFromPreview,
} from '@/lib/import-export/export-page-import-helpers'
import {
  getPresentImportPayloadKeys,
  isCompleteAppDataPayload,
  parseImportPayload,
  prepareImportPayload,
} from '@/lib/import-export/import-validation'
import type {
  ImportPayload,
  ImportPreviewMeta,
} from '@/lib/import-export/import-validation-types'
import {
  buildSampleDataset,
  emptyExistingRefs,
} from '@/lib/import-export/sample-dataset.fixture'

function sortById<T extends { id: string }>(records: T[]): T[] {
  return [...records].sort((left, right) => left.id.localeCompare(right.id))
}

function metaFor(payload: ImportPayload): ImportPreviewMeta {
  const presentKeys = getPresentImportPayloadKeys(payload)
  return {
    kind: 'app-data-json',
    presentKeys,
    isCompleteAppData: isCompleteAppDataPayload(presentKeys),
  }
}

function exportThenParse() {
  const dataset = buildSampleDataset()
  const { appData } = buildAppExportArtifacts(dataset)
  return parseImportPayload(JSON.parse(JSON.stringify(appData)))
}

async function clearAllTables() {
  await Promise.all(db.tables.map((table) => table.clear()))
}

beforeEach(async () => {
  await clearAllTables()
})

describe('export → import → database round-trip', () => {
  it('writes every exported record into the matching table', async () => {
    const dataset = buildSampleDataset()
    const payload = exportThenParse()
    const prepared = prepareImportPayload(payload, metaFor(payload), false, emptyExistingRefs())

    const counts = await importPayloadIntoDb(prepared)

    expect(sortById(await db.herds.toArray())).toEqual(sortById(dataset.herds))
    expect(sortById(await db.animals.toArray())).toEqual(sortById(dataset.animals))
    expect(sortById(await db.enclosures.toArray())).toEqual(sortById(dataset.enclosures))
    expect(sortById(await db.surveyAreas.toArray())).toEqual(sortById(dataset.surveyAreas))
    expect(sortById(await db.enclosureAssignments.toArray())).toEqual(
      sortById(dataset.enclosureAssignments),
    )
    expect(sortById(await db.sessions.toArray())).toEqual(sortById(dataset.sessions))
    expect(sortById(await db.trackpoints.toArray())).toEqual(sortById(dataset.trackpoints))
    expect(sortById(await db.events.toArray())).toEqual(sortById(dataset.events))
    expect(sortById(await db.workSessions.toArray())).toEqual(sortById(dataset.workSessions))
    expect(sortById(await db.workEvents.toArray())).toEqual(sortById(dataset.workEvents))
    expect(await db.settings.toArray()).toEqual(dataset.settings)

    expect(counts.herds).toBe(dataset.herds.length)
    expect(counts.trackpoints).toBe(dataset.trackpoints.length)
  })

  it('drops stale rows when replacing from a complete export', async () => {
    const dataset = buildSampleDataset()

    // A herd that exists only in the database — replacing must remove it.
    await db.herds.add({
      id: 'stale_herd',
      name: 'Veraltet',
      fallbackCount: null,
      isArchived: false,
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    })

    const payload = exportThenParse()
    const meta = metaFor(payload)
    expect(meta.isCompleteAppData).toBe(true)

    const prepared = prepareImportPayload(payload, meta, true, emptyExistingRefs())
    await importPayloadIntoDb(prepared)

    const herdIds = (await db.herds.toArray()).map((herd) => herd.id)
    expect(herdIds).not.toContain('stale_herd')
    expect(sortById(await db.herds.toArray())).toEqual(sortById(dataset.herds))
  })

  it('validates an additive import against the live database refs', async () => {
    // Seed only herds, then import animals that reference a stored herd. The
    // helper reads the existing refs straight from the database.
    const dataset = buildSampleDataset()
    await db.herds.bulkPut(dataset.herds)

    const payload: ImportPayload = {
      animals: [
        {
          id: 'animal_new',
          herdId: 'herd_a',
          earTag: 'IT-777',
          species: 'horses',
          isArchived: false,
          createdAt: '2026-06-01T08:00:00.000Z',
          updatedAt: '2026-06-01T08:00:00.000Z',
        },
      ],
    }
    const presentKeys = getPresentImportPayloadKeys(payload)

    const prepared = await prepareDbImportFromPreview(
      {
        sourceLabel: 'test',
        meta: { kind: 'app-data-json', presentKeys, isCompleteAppData: false },
        payload,
        counts: {
          herds: 0,
          animals: 1,
          enclosures: 0,
          surveyAreas: 0,
          enclosureAssignments: 0,
          grazingSessions: 0,
          trackpoints: 0,
          sessionEvents: 0,
          workSessions: 0,
          workEvents: 0,
          settings: 0,
        },
        warnings: [],
      },
      false,
    )
    await importPayloadIntoDb(prepared)

    expect(await db.animals.get('animal_new')).toBeTruthy()
  })
})
