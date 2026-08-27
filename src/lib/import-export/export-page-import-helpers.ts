import JSZip from 'jszip'
import {
  areCareMonitoringChecksHistoricallyEqual,
  validateCanonicalCareMonitoringCheck,
} from '@/lib/care/care-monitoring-integrity'
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
import {
  buildLocalChangeMetadata,
  getRecordChangeTimestamp,
} from '@/lib/sync/local-metadata'
import type {
  CareMonitoringCheck,
  ConservationPlan,
  Enclosure,
  GrazingSession,
} from '@/types/domain'

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
  const [animals, conservationPlans, enclosures, sessions, monitoringChecks, herdIds, workSessionIds] = await Promise.all([
    db.animals.toArray(),
    db.conservationPlans.toArray(),
    db.enclosures.toArray(),
    db.sessions.toArray(),
    db.careMonitoringChecks.toArray(),
    db.herds.toCollection().primaryKeys(),
    db.workSessions.toCollection().primaryKeys(),
  ])
  const activePlans = conservationPlans.filter((plan) => !plan.deletedAt)

  return {
    animalEarTags: new Map(
      animals.map((animal) => [animal.earTag.trim().toLowerCase(), animal.id])
    ),
    conservationPlanByEnclosureId: new Map(
      activePlans.map((plan) => [plan.enclosureId, plan.id]),
    ),
    conservationPlanEnclosureById: new Map(
      activePlans.map((plan) => [plan.id, plan.enclosureId]),
    ),
    careMonitoringChecksById: new Map(monitoringChecks.map((check) => [check.id, check])),
    historicalCheckPlanIds: new Set(monitoringChecks.map((check) => check.conservationPlanId)),
    enclosureIds: new Set(enclosures.filter((record) => !record.deletedAt).map((record) => record.id)),
    herdIds: new Set(herdIds.map((id) => String(id))),
    sessionIds: new Set(sessions.filter((record) => !record.deletedAt).map((record) => record.id)),
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

function normalizeImportedMonitoringMetadata(check: CareMonitoringCheck): CareMonitoringCheck {
  const timestamp = getRecordChangeTimestamp(check as unknown as Record<string, unknown>)
  const fallback = buildLocalChangeMetadata(timestamp)
  return {
    ...check,
    deviceId: check.deviceId?.trim() || fallback.deviceId,
    syncStatus: check.syncStatus ?? fallback.syncStatus,
    lastLocalChangeAt: check.lastLocalChangeAt?.trim() || fallback.lastLocalChangeAt,
    deletedAt: check.deletedAt ?? null,
  }
}

function overlayById<T extends { id: string }>(current: T[], imported: T[], clear: boolean) {
  const result = new Map<string, T>(clear ? [] : current.map((record) => [record.id, record]))
  imported.forEach((record) => result.set(record.id, record))
  return result
}

function assertMonitoringReferences(
  checks: Iterable<CareMonitoringCheck>,
  enclosures: Map<string, Enclosure>,
  plans: Map<string, ConservationPlan>,
  sessions: Map<string, GrazingSession>,
) {
  for (const check of checks) {
    const canonicalIssue = validateCanonicalCareMonitoringCheck(check)
    if (canonicalIssue) {
      throw new Error(`Pflegecheck "${check.id}" ist ungültig: ${canonicalIssue}.`)
    }
    const enclosure = enclosures.get(check.enclosureId)
    if (!enclosure || enclosure.deletedAt) {
      throw new Error(`Pflegecheck "${check.id}" verweist auf einen fehlenden oder gelöschten Pferch.`)
    }
    const plan = plans.get(check.conservationPlanId)
    if (!plan || plan.deletedAt) {
      throw new Error(`Pflegecheck "${check.id}" verweist auf einen fehlenden oder gelöschten Pflegeplan.`)
    }
    if (plan.enclosureId !== check.enclosureId) {
      throw new Error(`Pflegecheck "${check.id}" und Pflegeplan gehören nicht zum selben Pferch.`)
    }
    if (check.grazingSessionId) {
      const session = sessions.get(check.grazingSessionId)
      if (!session || session.deletedAt) {
        throw new Error(`Pflegecheck "${check.id}" verweist auf einen fehlenden oder gelöschten Weidegang.`)
      }
    }
  }
}

export async function importPayloadIntoDb(preparedImport: PreparedImportPayload) {
  const { clearKeys, counts, payload } = preparedImport
  await db.transaction(
    'rw',
    [
      db.herds,
      db.animals,
      db.enclosures,
      db.conservationPlans,
      db.careMonitoringChecks,
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
      const clearing = new Set(clearKeys)
      const [currentEnclosures, currentPlans, currentSessions, currentChecks] = await Promise.all([
        db.enclosures.toArray(),
        db.conservationPlans.toArray(),
        db.sessions.toArray(),
        db.careMonitoringChecks.toArray(),
      ])
      const importedChecks = payload.careMonitoringChecks.map(normalizeImportedMonitoringMetadata)
      const currentChecksById = new Map(currentChecks.map((check) => [check.id, check]))
      const newChecks: CareMonitoringCheck[] = []

      for (const check of importedChecks) {
        const canonicalIssue = validateCanonicalCareMonitoringCheck(check)
        if (canonicalIssue) {
          throw new Error(`Pflegecheck "${check.id}" ist ungültig: ${canonicalIssue}.`)
        }
        const existing = clearing.has('careMonitoringChecks')
          ? undefined
          : currentChecksById.get(check.id)
        if (existing) {
          if (!areCareMonitoringChecksHistoricallyEqual(existing, check)) {
            throw new Error(`Pflegecheck "${check.id}" kollidiert mit abweichender Monitoringhistorie.`)
          }
          continue
        }
        newChecks.push(check)
      }

      if (!clearing.has('conservationPlans') && !clearing.has('careMonitoringChecks')) {
        const existingPlansById = new Map(currentPlans.map((plan) => [plan.id, plan]))
        const referencedPlanIds = new Set(currentChecks.map((check) => check.conservationPlanId))
        for (const plan of payload.conservationPlans) {
          const existing = existingPlansById.get(plan.id)
          if (existing && existing.enclosureId !== plan.enclosureId && referencedPlanIds.has(plan.id)) {
            throw new Error(
              `Pflegeplan "${plan.id}" kann wegen vorhandener Monitoringhistorie nicht einem anderen Pferch zugeordnet werden.`,
            )
          }
        }
      }

      const finalEnclosures = overlayById(
        currentEnclosures,
        payload.enclosures,
        clearing.has('enclosures'),
      )
      const finalPlans = overlayById(
        currentPlans,
        payload.conservationPlans,
        clearing.has('conservationPlans'),
      )
      const finalSessions = overlayById(
        currentSessions,
        payload.grazingSessions,
        clearing.has('grazingSessions'),
      )
      const finalChecks = overlayById(
        currentChecks,
        clearing.has('careMonitoringChecks') ? importedChecks : newChecks,
        clearing.has('careMonitoringChecks'),
      )
      assertMonitoringReferences(
        finalChecks.values(),
        finalEnclosures,
        finalPlans,
        finalSessions,
      )

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
          conservationPlans: () => db.conservationPlans.clear(),
          careMonitoringChecks: () => db.careMonitoringChecks.clear(),
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
      if (payload.conservationPlans.length > 0) {
        await db.conservationPlans.bulkPut(payload.conservationPlans)
      }
      const checksToWrite = clearing.has('careMonitoringChecks') ? importedChecks : newChecks
      if (checksToWrite.length > 0) {
        await db.careMonitoringChecks.bulkAdd(checksToWrite)
      }
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
