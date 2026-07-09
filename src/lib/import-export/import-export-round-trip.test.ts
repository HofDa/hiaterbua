import { describe, expect, it } from 'vitest'
import { buildAppExportArtifacts } from '@/lib/import-export/export-page-app-archive-builders'
import {
  getPresentImportPayloadKeys,
  isCompleteAppDataPayload,
  parseImportPayload,
  prepareImportPayload,
} from '@/lib/import-export/import-validation'
import { importPayloadKeys } from '@/lib/import-export/import-validation-types'
import type {
  ImportPayload,
  ImportPreviewMeta,
} from '@/lib/import-export/import-validation-types'
import {
  buildSampleDataset,
  emptyExistingRefs,
} from '@/lib/import-export/sample-dataset.fixture'

/**
 * Re-creates the real export → file → import path: build the export artifact,
 * round-trip it through JSON (as the ZIP/JSON download does), then parse it back
 * into an import payload. `JSON` faithfully drops `undefined` and proves the
 * serialized form is what the importer accepts.
 */
function exportThenParse(): ImportPayload {
  const dataset = buildSampleDataset()
  const { appData } = buildAppExportArtifacts(dataset)
  const serialized = JSON.parse(JSON.stringify(appData))
  return parseImportPayload(serialized)
}

function metaFor(payload: ImportPayload): ImportPreviewMeta {
  const presentKeys = getPresentImportPayloadKeys(payload)
  return {
    kind: 'app-data-json',
    presentKeys,
    isCompleteAppData: isCompleteAppDataPayload(presentKeys),
  }
}

describe('app export → import round-trip', () => {
  it('re-imports a full export with no validation issues and preserves every record', () => {
    const dataset = buildSampleDataset()
    const payload = exportThenParse()

    const prepared = prepareImportPayload(payload, metaFor(payload), false, emptyExistingRefs())

    expect(prepared.payload.herds).toEqual(dataset.herds)
    expect(prepared.payload.animals).toEqual(dataset.animals)
    expect(prepared.payload.enclosures).toEqual(dataset.enclosures)
    expect(prepared.payload.surveyAreas).toEqual(dataset.surveyAreas)
    expect(prepared.payload.enclosureAssignments).toEqual(dataset.enclosureAssignments)
    expect(prepared.payload.grazingSessions).toEqual(dataset.sessions)
    expect(prepared.payload.trackpoints).toEqual(dataset.trackpoints)
    expect(prepared.payload.sessionEvents).toEqual(dataset.events)
    expect(prepared.payload.workSessions).toEqual(dataset.workSessions)
    expect(prepared.payload.workEvents).toEqual(dataset.workEvents)
    expect(prepared.payload.settings).toEqual(dataset.settings)
  })

  it('reports counts that match the exported dataset', () => {
    const dataset = buildSampleDataset()
    const payload = exportThenParse()

    const prepared = prepareImportPayload(payload, metaFor(payload), false, emptyExistingRefs())

    expect(prepared.counts).toEqual({
      herds: dataset.herds.length,
      animals: dataset.animals.length,
      enclosures: dataset.enclosures.length,
      surveyAreas: dataset.surveyAreas.length,
      enclosureAssignments: dataset.enclosureAssignments.length,
      grazingSessions: dataset.sessions.length,
      trackpoints: dataset.trackpoints.length,
      sessionEvents: dataset.events.length,
      workSessions: dataset.workSessions.length,
      workEvents: dataset.workEvents.length,
      settings: dataset.settings.length,
    })
  })

  it('clears every table when replacing from a complete app export', () => {
    const payload = exportThenParse()
    const meta = metaFor(payload)
    expect(meta.isCompleteAppData).toBe(true)

    const prepared = prepareImportPayload(payload, meta, true, emptyExistingRefs())

    expect([...prepared.clearKeys].sort()).toEqual([...importPayloadKeys].sort())
  })

  it('refuses to replace from a partial (incomplete) payload', () => {
    const payload = exportThenParse()
    const partial: ImportPayload = { herds: payload.herds }
    const presentKeys = getPresentImportPayloadKeys(partial)

    expect(() =>
      prepareImportPayload(
        partial,
        { kind: 'app-data-json', presentKeys, isCompleteAppData: false },
        true,
        emptyExistingRefs(),
      ),
    ).toThrow(/Ersetzen/)
  })

  it('imports additively against records that only exist in the database', () => {
    // Animal references a herd that is not in the payload but is already stored.
    const payload: ImportPayload = {
      animals: [
        {
          id: 'animal_x',
          herdId: 'herd_in_db',
          earTag: 'IT-999',
          species: 'goats',
          isArchived: false,
          createdAt: '2026-06-01T08:00:00.000Z',
          updatedAt: '2026-06-01T08:00:00.000Z',
        },
      ],
    }
    const presentKeys = getPresentImportPayloadKeys(payload)
    const existingRefs = emptyExistingRefs()
    existingRefs.herdIds.add('herd_in_db')

    const prepared = prepareImportPayload(
      payload,
      { kind: 'app-data-json', presentKeys, isCompleteAppData: false },
      false,
      existingRefs,
    )

    expect(prepared.payload.animals).toHaveLength(1)
  })

  it('accepts old exports without local sync metadata', () => {
    const payload: ImportPayload = {
      grazingSessions: [
        {
          id: 'session_old',
          herdId: 'herd_in_db',
          status: 'finished',
          startTime: '2026-06-01T08:00:00.000Z',
          endTime: '2026-06-01T09:00:00.000Z',
          durationS: 3600,
          movingTimeS: 1800,
          distanceM: 500,
        },
      ],
      trackpoints: [
        {
          id: 'trackpoint_old',
          sessionId: 'session_old',
          enclosureWalkId: null,
          seq: 1,
          timestamp: '2026-06-01T08:00:00.000Z',
          lat: 46.5,
          lon: 11.1,
          accepted: true,
        },
      ],
    }
    const presentKeys = getPresentImportPayloadKeys(payload)
    const existingRefs = emptyExistingRefs()
    existingRefs.herdIds.add('herd_in_db')

    const prepared = prepareImportPayload(
      payload,
      { kind: 'app-data-json', presentKeys, isCompleteAppData: false },
      false,
      existingRefs,
    )

    expect(prepared.payload.grazingSessions[0]).toMatchObject({
      id: 'session_old',
      createdAt: '2026-06-01T08:00:00.000Z',
      updatedAt: '2026-06-01T09:00:00.000Z',
    })
    expect(prepared.payload.trackpoints[0]).toMatchObject({
      id: 'trackpoint_old',
      createdAt: '2026-06-01T08:00:00.000Z',
      updatedAt: '2026-06-01T08:00:00.000Z',
    })
  })
})

describe('import validation rejects corrupted payloads', () => {
  function prepareCorrupted(mutate: (payload: ImportPayload) => void) {
    const payload = exportThenParse()
    mutate(payload)
    return () =>
      prepareImportPayload(payload, metaFor(payload), false, emptyExistingRefs())
  }

  it('rejects an animal that points at a missing herd', () => {
    const run = prepareCorrupted((payload) => {
      ;(payload.animals as Array<{ herdId: string }>)[0].herdId = 'ghost_herd'
    })
    expect(run).toThrow(/herdId "ghost_herd" fehlt/)
  })

  it('rejects a trackpoint that points at a missing session', () => {
    const run = prepareCorrupted((payload) => {
      ;(payload.trackpoints as Array<{ sessionId: string | null }>)[0].sessionId =
        'ghost_session'
    })
    expect(run).toThrow(/sessionId "ghost_session" fehlt/)
  })

  it('rejects a session event that points at a missing session', () => {
    const run = prepareCorrupted((payload) => {
      ;(payload.sessionEvents as Array<{ sessionId: string }>)[0].sessionId = 'ghost_session'
    })
    expect(run).toThrow(/sessionEvents: sessionId "ghost_session" fehlt/)
  })

  it('rejects an enclosure assignment that points at a missing enclosure', () => {
    const run = prepareCorrupted((payload) => {
      ;(payload.enclosureAssignments as Array<{ enclosureId: string }>)[0].enclosureId =
        'ghost_enclosure'
    })
    expect(run).toThrow(/enclosureId "ghost_enclosure" fehlt/)
  })

  it('rejects a work event that points at a missing work session', () => {
    const run = prepareCorrupted((payload) => {
      ;(payload.workEvents as Array<{ workSessionId: string }>)[0].workSessionId = 'ghost_work'
    })
    expect(run).toThrow(/workSessionId "ghost_work" fehlt/)
  })

  it('rejects duplicate record ids within a table', () => {
    const run = prepareCorrupted((payload) => {
      const herds = payload.herds as unknown[]
      herds.push(structuredClone(herds[0]))
    })
    expect(run).toThrow(/doppelte id/)
  })

  it('rejects duplicate animal ear tags within a table', () => {
    const run = prepareCorrupted((payload) => {
      const animals = payload.animals as Array<{ id: string; earTag: string }>
      animals.push({ ...animals[0], id: 'animal_dup' })
    })
    expect(run).toThrow(/doppelte Ohrmarke/)
  })

  it('rejects a record that violates its schema', () => {
    const run = prepareCorrupted((payload) => {
      ;(payload.animals as Array<{ species: string }>)[0].species = 'dragon'
    })
    expect(run).toThrow(/Importdaten sind inkonsistent/)
  })
})
