import JSZip from 'jszip'
import { db } from '@/lib/db/dexie'
import { buildSurveyAreasFromGeoJson } from '@/lib/import-export/file-formats'
import {
  type ExistingImportRefs,
  getImportCounts,
  getPresentImportPayloadKeys,
  isCompleteAppDataPayload,
  parseImportPayload,
  prepareImportPayload,
  type ImportPayload,
  type ImportPreviewMeta,
  type ImportSourceKind,
  type PreparedImportPayload,
} from '@/lib/import-export/import-validation'

export type ImportPreview = {
  sourceLabel: string
  meta: ImportPreviewMeta
  payload: ImportPayload
  counts: ReturnType<typeof getImportCounts>
  warnings: string[]
}

function buildImportPreviewResult(
  sourceLabel: string,
  kind: ImportSourceKind,
  payload: ImportPayload,
  warnings: string[]
): ImportPreview {
  const presentKeys = getPresentImportPayloadKeys(payload)
  const isCompleteAppData = isCompleteAppDataPayload(presentKeys)
  const counts = getImportCounts(payload)
  const nextWarnings = [...warnings]

  if (
    (kind === 'zip-export' || kind === 'app-data-json') &&
    presentKeys.length > 0 &&
    !isCompleteAppData
  ) {
    nextWarnings.push(
      'Datei enthält nur Teilmengen der App-Daten. `Ersetzen` ist damit nicht erlaubt.'
    )
  }

  if (Object.values(counts).every((count) => count === 0)) {
    nextWarnings.push('Datei enthält keine importierbaren Datensätze.')
  }

  return {
    sourceLabel,
    meta: {
      kind,
      presentKeys,
      isCompleteAppData,
    },
    payload,
    counts,
    warnings: nextWarnings,
  }
}

async function getExistingImportRefs(): Promise<ExistingImportRefs> {
  const [animals, herdIds, enclosureIds, sessionIds, workSessionIds] = await Promise.all([
    db.animals.toArray(),
    db.herds.toCollection().primaryKeys(),
    db.enclosures.toCollection().primaryKeys(),
    db.sessions.toCollection().primaryKeys(),
    db.workSessions.toCollection().primaryKeys(),
  ])

  return {
    animalEarTags: new Map(
      animals.map((animal) => [animal.earTag.trim().toLowerCase(), animal.id])
    ),
    enclosureIds: new Set(enclosureIds.map((id) => String(id))),
    herdIds: new Set(herdIds.map((id) => String(id))),
    sessionIds: new Set(sessionIds.map((id) => String(id))),
    workSessionIds: new Set(workSessionIds.map((id) => String(id))),
  }
}

export function canImportPreviewReplaceExisting(importPreview: ImportPreview | null) {
  if (!importPreview) {
    return false
  }

  return (
    importPreview.meta.isCompleteAppData ||
    (importPreview.meta.presentKeys.length > 0 &&
      importPreview.meta.presentKeys.every(
        (key) => key === 'surveyAreas' || key === 'settings'
      ))
  )
}

export async function buildImportPreview(file: File): Promise<ImportPreview> {
  const fileName = file.name.toLowerCase()

  if (fileName.endsWith('.zip')) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer())
    const appDataEntry = zip.file('app-data.json')
    const surveyAreasEntry =
      zip.file('spatial/survey_areas.geojson') ?? zip.file('survey_areas.geojson')

    let payload: ImportPayload = {}
    const warnings: string[] = []

    if (appDataEntry) {
      payload = parseImportPayload(JSON.parse(await appDataEntry.async('string')))
    } else {
      warnings.push('ZIP enthält keine `app-data.json`.')
    }

    if (surveyAreasEntry) {
      const importedSurveyAreas = buildSurveyAreasFromGeoJson(
        await surveyAreasEntry.async('string'),
        'Untersuchungsfläche'
      )
      if (payload.surveyAreas) {
        warnings.push(
          'ZIP enthält Untersuchungsflächen sowohl in `app-data.json` als auch als GeoJSON. `app-data.json` wird bevorzugt.'
        )
      } else {
        payload = {
          ...payload,
          surveyAreas: importedSurveyAreas,
        }
      }
    }

    if (!appDataEntry && !surveyAreasEntry) {
      throw new Error('ZIP enthält keine importierbaren Dateien.')
    }

    return buildImportPreviewResult(
      appDataEntry ? 'ZIP-Export' : 'ZIP mit Untersuchungsflächen',
      appDataEntry ? 'zip-export' : 'survey-geojson',
      payload,
      warnings
    )
  }

  if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
    const content = await file.text()
    const parsed = JSON.parse(content) as Record<string, unknown>
    const payload = parseImportPayload(parsed)
    const presentKeys = getPresentImportPayloadKeys(payload)

    if (
      presentKeys.length > 0 ||
      (typeof parsed.app === 'string' && parsed.app.toLowerCase().includes('hiaterbua'))
    ) {
      return buildImportPreviewResult('App-Daten JSON', 'app-data-json', payload, [])
    }

    const surveyAreas = buildSurveyAreasFromGeoJson(content, 'Untersuchungsfläche')

    return buildImportPreviewResult(
      'Untersuchungsflächen GeoJSON',
      'survey-geojson',
      { surveyAreas },
      []
    )
  }

  throw new Error('Unterstützt werden ZIP, JSON und GeoJSON.')
}

export async function prepareDbImportFromPreview(
  importPreview: ImportPreview,
  replaceExisting: boolean
) {
  const existingRefs = await getExistingImportRefs()

  return prepareImportPayload(
    importPreview.payload,
    importPreview.meta,
    replaceExisting,
    existingRefs
  )
}

export async function importPayloadIntoDb(preparedImport: PreparedImportPayload) {
  const { clearKeys, counts, payload } = preparedImport
  await db.transaction(
    'rw',
    [
      db.herds,
      db.animals,
      db.enclosures,
      db.surveyAreas,
      db.enclosureAssignments,
      db.sessions,
      db.trackpoints,
      db.events,
      db.workSessions,
      db.workEvents,
      db.settings,
    ],
    async () => {
      if (clearKeys.length > 0) {
        const clearTableByKey = {
          workEvents: () => db.workEvents.clear(),
          workSessions: () => db.workSessions.clear(),
          sessionEvents: () => db.events.clear(),
          trackpoints: () => db.trackpoints.clear(),
          grazingSessions: () => db.sessions.clear(),
          enclosureAssignments: () => db.enclosureAssignments.clear(),
          surveyAreas: () => db.surveyAreas.clear(),
          animals: () => db.animals.clear(),
          enclosures: () => db.enclosures.clear(),
          herds: () => db.herds.clear(),
          settings: () => db.settings.clear(),
        } satisfies Record<keyof typeof counts, () => Promise<void>>

        for (const key of clearKeys) {
          await clearTableByKey[key]()
        }
      }

      if (payload.herds.length > 0) await db.herds.bulkPut(payload.herds)
      if (payload.animals.length > 0) await db.animals.bulkPut(payload.animals)
      if (payload.enclosures.length > 0) await db.enclosures.bulkPut(payload.enclosures)
      if (payload.surveyAreas.length > 0) await db.surveyAreas.bulkPut(payload.surveyAreas)
      if (payload.enclosureAssignments.length > 0) {
        await db.enclosureAssignments.bulkPut(payload.enclosureAssignments)
      }
      if (payload.grazingSessions.length > 0) await db.sessions.bulkPut(payload.grazingSessions)
      if (payload.trackpoints.length > 0) await db.trackpoints.bulkPut(payload.trackpoints)
      if (payload.sessionEvents.length > 0) await db.events.bulkPut(payload.sessionEvents)
      if (payload.workSessions.length > 0) await db.workSessions.bulkPut(payload.workSessions)
      if (payload.workEvents.length > 0) await db.workEvents.bulkPut(payload.workEvents)
      if (payload.settings.length > 0) await db.settings.bulkPut(payload.settings)
    }
  )

  return counts
}
