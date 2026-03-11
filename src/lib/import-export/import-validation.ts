import { defaultAppSettings } from '@/lib/settings/defaults'
import {
  ensureNoDuplicateAnimalEarTags,
  ensureNoDuplicateIds,
  getClearKeys,
  parseRecords,
  summarizeIssues,
  validateReferences,
} from '@/lib/import-export/import-validation-helpers'
import {
  animalSchema,
  enclosureAssignmentSchema,
  enclosureSchema,
  grazingSessionSchema,
  herdSchema,
  rawImportPayloadSchema,
  sessionEventSchema,
  settingsRecordSchema,
  surveyAreaSchema,
  trackPointSchema,
  workEventSchema,
  workSessionSchema,
} from '@/lib/import-export/import-validation-schemas'
import {
  importPayloadKeys,
  type ExistingImportRefs,
  type ImportCounts,
  type ImportPayload,
  type ImportPayloadKey,
  type ImportPreviewMeta,
  type PreparedImportPayload,
} from '@/lib/import-export/import-validation-types'

export { importPayloadKeys }
export type {
  ExistingImportRefs,
  ImportCounts,
  ImportPayload,
  ImportPayloadKey,
  ImportPreviewMeta,
  ImportSourceKind,
  PreparedImportPayload,
} from '@/lib/import-export/import-validation-types'

export function parseImportPayload(raw: unknown): ImportPayload {
  return rawImportPayloadSchema.parse(raw) as ImportPayload
}

export function getPresentImportPayloadKeys(payload: ImportPayload) {
  return importPayloadKeys.filter((key) => Object.prototype.hasOwnProperty.call(payload, key))
}

export function isCompleteAppDataPayload(presentKeys: ImportPayloadKey[]) {
  return importPayloadKeys.every((key) => presentKeys.includes(key))
}

export function getImportCounts(payload: ImportPayload): ImportCounts {
  return {
    herds: payload.herds?.length ?? 0,
    animals: payload.animals?.length ?? 0,
    enclosures: payload.enclosures?.length ?? 0,
    surveyAreas: payload.surveyAreas?.length ?? 0,
    enclosureAssignments: payload.enclosureAssignments?.length ?? 0,
    grazingSessions: payload.grazingSessions?.length ?? 0,
    trackpoints: payload.trackpoints?.length ?? 0,
    sessionEvents: payload.sessionEvents?.length ?? 0,
    workSessions: payload.workSessions?.length ?? 0,
    workEvents: payload.workEvents?.length ?? 0,
    settings: payload.settings?.length ?? 0,
  }
}

export function prepareImportPayload(
  rawPayload: ImportPayload,
  meta: ImportPreviewMeta,
  replaceExisting: boolean,
  existingRefs: ExistingImportRefs
): PreparedImportPayload {
  const clearKeys = getClearKeys(meta, replaceExisting)
  const issues: string[] = []

  const payload: PreparedImportPayload['payload'] = {
    herds: parseRecords('herds', rawPayload.herds, herdSchema, issues),
    animals: parseRecords('animals', rawPayload.animals, animalSchema, issues),
    enclosures: parseRecords('enclosures', rawPayload.enclosures, enclosureSchema, issues),
    surveyAreas: parseRecords('surveyAreas', rawPayload.surveyAreas, surveyAreaSchema, issues),
    enclosureAssignments: parseRecords(
      'enclosureAssignments',
      rawPayload.enclosureAssignments,
      enclosureAssignmentSchema,
      issues
    ),
    grazingSessions: parseRecords(
      'grazingSessions',
      rawPayload.grazingSessions,
      grazingSessionSchema,
      issues
    ),
    trackpoints: parseRecords('trackpoints', rawPayload.trackpoints, trackPointSchema, issues),
    sessionEvents: parseRecords(
      'sessionEvents',
      rawPayload.sessionEvents,
      sessionEventSchema,
      issues
    ),
    workSessions: parseRecords(
      'workSessions',
      rawPayload.workSessions,
      workSessionSchema,
      issues
    ),
    workEvents: parseRecords('workEvents', rawPayload.workEvents, workEventSchema, issues),
    settings: parseRecords('settings', rawPayload.settings, settingsRecordSchema, issues),
  }

  if (payload.settings.length > 1) {
    issues.push('settings: höchstens ein Eintrag ist erlaubt.')
    payload.settings = [payload.settings[payload.settings.length - 1]]
  }

  ;([
    ['herds', payload.herds],
    ['animals', payload.animals],
    ['enclosures', payload.enclosures],
    ['surveyAreas', payload.surveyAreas],
    ['enclosureAssignments', payload.enclosureAssignments],
    ['grazingSessions', payload.grazingSessions],
    ['trackpoints', payload.trackpoints],
    ['sessionEvents', payload.sessionEvents],
    ['workSessions', payload.workSessions],
    ['workEvents', payload.workEvents],
  ] as const).forEach(([label, records]) => {
    ensureNoDuplicateIds(label, records, issues)
  })

  ensureNoDuplicateAnimalEarTags(payload.animals, issues)

  if (clearKeys.includes('settings') && payload.settings.length === 0) {
    payload.settings = [defaultAppSettings]
  }

  validateReferences(payload, existingRefs, clearKeys, issues)

  if (issues.length > 0) {
    throw new Error(`Importdaten sind inkonsistent: ${summarizeIssues(issues)}`)
  }

  return {
    clearKeys,
    counts: {
      herds: payload.herds.length,
      animals: payload.animals.length,
      enclosures: payload.enclosures.length,
      surveyAreas: payload.surveyAreas.length,
      enclosureAssignments: payload.enclosureAssignments.length,
      grazingSessions: payload.grazingSessions.length,
      trackpoints: payload.trackpoints.length,
      sessionEvents: payload.sessionEvents.length,
      workSessions: payload.workSessions.length,
      workEvents: payload.workEvents.length,
      settings: payload.settings.length,
    },
    payload,
  }
}
