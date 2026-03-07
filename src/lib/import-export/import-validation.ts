import { area as turfArea } from '@turf/turf'
import { z } from 'zod'
import { defaultAppSettings, normalizeMapBaseLayer } from '@/lib/settings/defaults'
import type {
  Animal,
  AppSettings,
  Enclosure,
  EnclosureAssignment,
  GrazingSession,
  Herd,
  SessionEvent,
  SurveyArea,
  TrackPoint,
  WorkEvent,
  WorkSession,
} from '@/types/domain'

export const importPayloadKeys = [
  'herds',
  'animals',
  'enclosures',
  'surveyAreas',
  'enclosureAssignments',
  'grazingSessions',
  'trackpoints',
  'sessionEvents',
  'workSessions',
  'workEvents',
  'settings',
] as const

const limitedReplaceKeys = new Set<ImportPayloadKey>(['surveyAreas', 'settings'])

export type ImportPayloadKey = (typeof importPayloadKeys)[number]

export type ImportPayload = Partial<Record<ImportPayloadKey, unknown[]>>

export type ImportSourceKind = 'zip-export' | 'app-data-json' | 'survey-geojson'

export type ImportCounts = Record<ImportPayloadKey, number>

export type ImportPreviewMeta = {
  kind: ImportSourceKind
  presentKeys: ImportPayloadKey[]
  isCompleteAppData: boolean
}

export type PreparedImportPayload = {
  clearKeys: ImportPayloadKey[]
  counts: {
    herds: number
    animals: number
    enclosures: number
    surveyAreas: number
    enclosureAssignments: number
    grazingSessions: number
    trackpoints: number
    sessionEvents: number
    workSessions: number
    workEvents: number
    settings: number
  }
  payload: {
    herds: Herd[]
    animals: Animal[]
    enclosures: Enclosure[]
    surveyAreas: SurveyArea[]
    enclosureAssignments: EnclosureAssignment[]
    grazingSessions: GrazingSession[]
    trackpoints: TrackPoint[]
    sessionEvents: SessionEvent[]
    workSessions: WorkSession[]
    workEvents: WorkEvent[]
    settings: AppSettings[]
  }
}

export type ExistingImportRefs = {
  animalEarTags: Map<string, string>
  enclosureIds: Set<string>
  herdIds: Set<string>
  sessionIds: Set<string>
  workSessionIds: Set<string>
}

const rawImportPayloadSchema = z
  .object(
    Object.fromEntries(importPayloadKeys.map((key) => [key, z.array(z.unknown()).optional()])) as Record<
      ImportPayloadKey,
      z.ZodOptional<z.ZodArray<z.ZodUnknown>>
    >
  )
  .passthrough()

const nonEmptyString = z.string().trim().min(1)
const timestampString = z.string().trim().min(1)

const optionalTrimmedString = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}, z.string().optional())

const nullableTrimmedString = z.preprocess((value) => {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}, z.string().nullable())

const optionalNumber = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined
  return value
}, z.coerce.number().finite().optional())

const nullableNumber = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return null
  return value
}, z.coerce.number().finite().nullable())

const nullableInteger = nullableNumber.transform((value) =>
  value === null ? null : Math.round(value)
)

const coordinateSchema = z.tuple([z.coerce.number().finite(), z.coerce.number().finite()])

const polygonGeometrySchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(coordinateSchema).min(1)).min(1),
})

const multiPolygonGeometrySchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(z.array(coordinateSchema).min(1)).min(1)).min(1),
})

const enclosureGeometrySchema = z.preprocess(
  (value) => (value === undefined ? null : value),
  z.union([polygonGeometrySchema, z.null()])
)

const surveyGeometrySchema = z.union([polygonGeometrySchema, multiPolygonGeometrySchema])

const herdSchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    fallbackCount: nullableInteger.optional(),
    notes: optionalTrimmedString,
    isArchived: z.boolean(),
    createdAt: timestampString,
    updatedAt: timestampString,
  })
  .transform((value): Herd => ({
    id: value.id,
    name: value.name,
    fallbackCount: value.fallbackCount ?? null,
    notes: value.notes,
    isArchived: value.isArchived,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }))

const animalSchema = z
  .object({
    id: nonEmptyString,
    herdId: nonEmptyString,
    earTag: nonEmptyString,
    species: z.enum(['cattle', 'sheep', 'goats', 'horses', 'other']),
    name: optionalTrimmedString,
    notes: optionalTrimmedString,
    isArchived: z.boolean(),
    createdAt: timestampString,
    updatedAt: timestampString,
  })
  .transform((value): Animal => ({
    id: value.id,
    herdId: value.herdId,
    earTag: value.earTag,
    species: value.species,
    name: value.name,
    notes: value.notes,
    isArchived: value.isArchived,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }))

const enclosureSchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    method: z.enum(['draw', 'walk']),
    rootEnclosureId: nullableTrimmedString.optional(),
    version: nullableInteger.optional(),
    supersededByEnclosureId: nullableTrimmedString.optional(),
    supersededAt: nullableTrimmedString.optional(),
    geometry: enclosureGeometrySchema,
    areaM2: optionalNumber,
    areaHa: optionalNumber,
    herdId: nullableTrimmedString.optional(),
    notes: optionalTrimmedString,
    avgAccuracyM: nullableNumber.optional(),
    pointsCount: nullableInteger.optional(),
    createdAt: timestampString,
    updatedAt: timestampString,
  })
  .transform((value): Enclosure => {
    const derivedAreaM2 = value.geometry ? getAreaMetrics(value.geometry).areaM2 : 0
    const areaM2 = value.areaM2 ?? derivedAreaM2

    return {
      id: value.id,
      name: value.name,
      method: value.method,
      rootEnclosureId: value.rootEnclosureId ?? null,
      version: value.version ?? null,
      supersededByEnclosureId: value.supersededByEnclosureId ?? null,
      supersededAt: value.supersededAt ?? null,
      geometry: value.geometry,
      areaM2,
      areaHa: value.areaHa ?? areaM2 / 10_000,
      herdId: value.herdId ?? null,
      notes: value.notes,
      avgAccuracyM: value.avgAccuracyM ?? null,
      pointsCount: value.pointsCount ?? null,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    }
  })

const surveyAreaSchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    geometry: surveyGeometrySchema,
    notes: optionalTrimmedString,
    areaM2: optionalNumber,
    areaHa: optionalNumber,
    createdAt: timestampString,
    updatedAt: timestampString,
  })
  .transform((value): SurveyArea => {
    const metrics = getAreaMetrics(value.geometry)
    const areaM2 = value.areaM2 ?? metrics.areaM2

    return {
      id: value.id,
      name: value.name,
      geometry: value.geometry,
      notes: value.notes,
      areaM2,
      areaHa: value.areaHa ?? areaM2 / 10_000,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    }
  })

const enclosureAssignmentSchema = z
  .object({
    id: nonEmptyString,
    enclosureId: nonEmptyString,
    herdId: nonEmptyString,
    count: nullableInteger.optional(),
    startTime: nullableTrimmedString.optional(),
    endTime: nullableTrimmedString.optional(),
    notes: optionalTrimmedString,
    createdAt: timestampString,
    updatedAt: timestampString,
  })
  .transform((value): EnclosureAssignment => ({
    id: value.id,
    enclosureId: value.enclosureId,
    herdId: value.herdId,
    count: value.count ?? null,
    startTime: value.startTime ?? null,
    endTime: value.endTime ?? null,
    notes: value.notes,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }))

const grazingSessionSchema = z
  .object({
    id: nonEmptyString,
    herdId: nonEmptyString,
    status: z.enum(['active', 'paused', 'finished']),
    startTime: timestampString,
    endTime: nullableTrimmedString.optional(),
    durationS: optionalNumber,
    movingTimeS: optionalNumber,
    distanceM: optionalNumber,
    avgSpeedMps: nullableNumber.optional(),
    avgAccuracyM: nullableNumber.optional(),
    notes: optionalTrimmedString,
    createdAt: timestampString.optional(),
    updatedAt: timestampString.optional(),
  })
  .transform((value): GrazingSession => ({
    id: value.id,
    herdId: value.herdId,
    status: value.status,
    startTime: value.startTime,
    endTime: value.endTime ?? null,
    durationS: value.durationS ?? 0,
    movingTimeS: value.movingTimeS ?? 0,
    distanceM: value.distanceM ?? 0,
    avgSpeedMps: value.avgSpeedMps ?? null,
    avgAccuracyM: value.avgAccuracyM ?? null,
    notes: value.notes,
    createdAt: value.createdAt ?? value.startTime,
    updatedAt: value.updatedAt ?? value.endTime ?? value.startTime,
  }))

const trackPointSchema = z
  .object({
    id: nonEmptyString,
    sessionId: nullableTrimmedString.optional(),
    enclosureWalkId: nullableTrimmedString.optional(),
    seq: z.coerce.number().int(),
    timestamp: timestampString,
    lat: z.coerce.number().finite(),
    lon: z.coerce.number().finite(),
    accuracyM: nullableNumber.optional(),
    speedMps: nullableNumber.optional(),
    headingDeg: nullableNumber.optional(),
    accepted: z.boolean().optional(),
  })
  .transform((value): TrackPoint => ({
    id: value.id,
    sessionId: value.sessionId ?? null,
    enclosureWalkId: value.enclosureWalkId ?? null,
    seq: value.seq,
    timestamp: value.timestamp,
    lat: value.lat,
    lon: value.lon,
    accuracyM: value.accuracyM ?? null,
    speedMps: value.speedMps ?? null,
    headingDeg: value.headingDeg ?? null,
    accepted: value.accepted ?? true,
  }))

const sessionEventSchema = z
  .object({
    id: nonEmptyString,
    sessionId: nonEmptyString,
    timestamp: timestampString,
    type: z.enum(['water', 'rest', 'move', 'disturbance', 'note', 'start', 'pause', 'resume', 'stop']),
    lat: nullableNumber.optional(),
    lon: nullableNumber.optional(),
    comment: optionalTrimmedString,
  })
  .transform((value): SessionEvent => ({
    id: value.id,
    sessionId: value.sessionId,
    timestamp: value.timestamp,
    type: value.type,
    lat: value.lat ?? null,
    lon: value.lon ?? null,
    comment: value.comment,
  }))

const workSessionSchema = z
  .object({
    id: nonEmptyString,
    type: z.enum(['herding', 'driving', 'fence', 'control', 'water', 'transport', 'other']),
    status: z.enum(['active', 'paused', 'finished']),
    herdId: nullableTrimmedString.optional(),
    enclosureId: nullableTrimmedString.optional(),
    startTime: timestampString,
    endTime: nullableTrimmedString.optional(),
    activeSince: nullableTrimmedString.optional(),
    durationS: optionalNumber,
    reminderIntervalMin: nullableInteger.optional(),
    lastReminderAt: nullableTrimmedString.optional(),
    notes: optionalTrimmedString,
    createdAt: timestampString.optional(),
    updatedAt: timestampString.optional(),
  })
  .transform((value): WorkSession => ({
    id: value.id,
    type: value.type,
    status: value.status,
    herdId: value.herdId ?? null,
    enclosureId: value.enclosureId ?? null,
    startTime: value.startTime,
    endTime: value.endTime ?? null,
    activeSince: value.activeSince ?? null,
    durationS: value.durationS ?? 0,
    reminderIntervalMin: value.reminderIntervalMin ?? null,
    lastReminderAt: value.lastReminderAt ?? null,
    notes: value.notes,
    createdAt: value.createdAt ?? value.startTime,
    updatedAt: value.updatedAt ?? value.endTime ?? value.startTime,
  }))

const workEventSchema = z
  .object({
    id: nonEmptyString,
    workSessionId: nonEmptyString,
    timestamp: timestampString,
    type: z.enum(['start', 'pause', 'resume', 'stop', 'note']),
    comment: optionalTrimmedString,
  })
  .transform((value): WorkEvent => ({
    id: value.id,
    workSessionId: value.workSessionId,
    timestamp: value.timestamp,
    type: value.type,
    comment: value.comment,
  }))

const settingsRecordSchema = z
  .object({
    id: z.string().optional(),
    language: z.enum(['de', 'it']).optional(),
    mapBaseLayer: z.string().optional(),
    gpsAccuracyThresholdM: optionalNumber,
    gpsMinTimeS: optionalNumber,
    gpsMinDistanceM: optionalNumber,
    tileCachingEnabled: z.boolean().optional(),
    theme: z.enum(['system', 'light']).optional(),
  })
  .transform((value): AppSettings => ({
    id: 'app',
    language: value.language ?? defaultAppSettings.language,
    mapBaseLayer: normalizeMapBaseLayer(value.mapBaseLayer),
    gpsAccuracyThresholdM: Math.max(
      1,
      Math.round(value.gpsAccuracyThresholdM ?? defaultAppSettings.gpsAccuracyThresholdM)
    ),
    gpsMinTimeS: Math.max(1, Math.round(value.gpsMinTimeS ?? defaultAppSettings.gpsMinTimeS)),
    gpsMinDistanceM: Math.max(
      1,
      Math.round(value.gpsMinDistanceM ?? defaultAppSettings.gpsMinDistanceM)
    ),
    tileCachingEnabled: value.tileCachingEnabled ?? defaultAppSettings.tileCachingEnabled,
    theme: value.theme ?? defaultAppSettings.theme,
  }))

function getAreaMetrics(geometry: Enclosure['geometry'] | SurveyArea['geometry']) {
  const areaM2 = turfArea({
    type: 'Feature',
    geometry,
    properties: {},
  })

  return {
    areaM2,
    areaHa: areaM2 / 10_000,
  }
}

function formatSchemaIssues(
  label: string,
  index: number,
  issues: z.ZodIssue[]
) {
  return issues.map((issue) => {
    const path = issue.path.length > 0 ? `.${issue.path.join('.')}` : ''
    return `${label}[${index}]${path}: ${issue.message}`
  })
}

function parseRecords<T>(
  label: ImportPayloadKey,
  records: unknown[] | undefined,
  schema: z.ZodType<T>,
  issues: string[]
) {
  const parsed: T[] = []

  if (!records) {
    return parsed
  }

  records.forEach((record, index) => {
    const result = schema.safeParse(record)
    if (!result.success) {
      issues.push(...formatSchemaIssues(label, index, result.error.issues))
      return
    }

    parsed.push(result.data)
  })

  return parsed
}

function ensureNoDuplicateIds(
  label: ImportPayloadKey,
  records: Array<{ id: string }>,
  issues: string[]
) {
  const seen = new Set<string>()

  for (const record of records) {
    if (seen.has(record.id)) {
      issues.push(`${label}: doppelte id "${record.id}" im Import.`)
      continue
    }

    seen.add(record.id)
  }
}

function ensureNoDuplicateAnimalEarTags(
  animals: Animal[],
  issues: string[]
) {
  const seen = new Map<string, string>()

  for (const animal of animals) {
    const normalizedEarTag = animal.earTag.trim().toLowerCase()
    const existingId = seen.get(normalizedEarTag)

    if (existingId && existingId !== animal.id) {
      issues.push(`animals: doppelte Ohrmarke "${animal.earTag}" im Import.`)
      continue
    }

    seen.set(normalizedEarTag, animal.id)
  }
}

function validateReferences(
  payload: PreparedImportPayload['payload'],
  existingRefs: ExistingImportRefs,
  clearKeys: ImportPayloadKey[],
  issues: string[]
) {
  const clearing = new Set(clearKeys)
  const importedAnimalIds = new Set(payload.animals.map((animal) => animal.id))
  const availableHerdIds = new Set<string>(
    clearing.has('herds') ? [] : existingRefs.herdIds
  )
  const availableEnclosureIds = new Set<string>(
    clearing.has('enclosures') ? [] : existingRefs.enclosureIds
  )
  const availableSessionIds = new Set<string>(
    clearing.has('grazingSessions') ? [] : existingRefs.sessionIds
  )
  const availableWorkSessionIds = new Set<string>(
    clearing.has('workSessions') ? [] : existingRefs.workSessionIds
  )
  const availableAnimalEarTags = clearing.has('animals')
    ? new Map<string, string>()
    : new Map(existingRefs.animalEarTags)

  payload.herds.forEach((herd) => availableHerdIds.add(herd.id))
  payload.enclosures.forEach((enclosure) => availableEnclosureIds.add(enclosure.id))
  payload.grazingSessions.forEach((session) => availableSessionIds.add(session.id))
  payload.workSessions.forEach((session) => availableWorkSessionIds.add(session.id))

  payload.animals.forEach((animal) => {
    const normalizedEarTag = animal.earTag.trim().toLowerCase()
    const existingId = availableAnimalEarTags.get(normalizedEarTag)

    if (existingId && existingId !== animal.id && !importedAnimalIds.has(existingId)) {
      issues.push(
        `animals: Ohrmarke "${animal.earTag}" kollidiert mit vorhandenem Tier "${existingId}".`
      )
    }

    availableAnimalEarTags.set(normalizedEarTag, animal.id)

    if (!availableHerdIds.has(animal.herdId)) {
      issues.push(`animals: herdId "${animal.herdId}" fehlt für Tier "${animal.id}".`)
    }
  })

  payload.enclosures.forEach((enclosure) => {
    if (enclosure.herdId && !availableHerdIds.has(enclosure.herdId)) {
      issues.push(`enclosures: herdId "${enclosure.herdId}" fehlt für Pferch "${enclosure.id}".`)
    }

    if (enclosure.rootEnclosureId && !availableEnclosureIds.has(enclosure.rootEnclosureId)) {
      issues.push(
        `enclosures: rootEnclosureId "${enclosure.rootEnclosureId}" fehlt für Pferch "${enclosure.id}".`
      )
    }

    if (
      enclosure.supersededByEnclosureId &&
      !availableEnclosureIds.has(enclosure.supersededByEnclosureId)
    ) {
      issues.push(
        `enclosures: supersededByEnclosureId "${enclosure.supersededByEnclosureId}" fehlt für Pferch "${enclosure.id}".`
      )
    }
  })

  payload.enclosureAssignments.forEach((assignment) => {
    if (!availableHerdIds.has(assignment.herdId)) {
      issues.push(
        `enclosureAssignments: herdId "${assignment.herdId}" fehlt für Belegung "${assignment.id}".`
      )
    }

    if (!availableEnclosureIds.has(assignment.enclosureId)) {
      issues.push(
        `enclosureAssignments: enclosureId "${assignment.enclosureId}" fehlt für Belegung "${assignment.id}".`
      )
    }
  })

  payload.grazingSessions.forEach((session) => {
    if (!availableHerdIds.has(session.herdId)) {
      issues.push(`grazingSessions: herdId "${session.herdId}" fehlt für Session "${session.id}".`)
    }
  })

  payload.trackpoints.forEach((trackpoint) => {
    if (!trackpoint.sessionId && !trackpoint.enclosureWalkId) {
      issues.push(
        `trackpoints: Punkt "${trackpoint.id}" braucht sessionId oder enclosureWalkId.`
      )
    }

    if (trackpoint.sessionId && !availableSessionIds.has(trackpoint.sessionId)) {
      issues.push(
        `trackpoints: sessionId "${trackpoint.sessionId}" fehlt für Punkt "${trackpoint.id}".`
      )
    }

    if (trackpoint.enclosureWalkId && !availableEnclosureIds.has(trackpoint.enclosureWalkId)) {
      issues.push(
        `trackpoints: enclosureWalkId "${trackpoint.enclosureWalkId}" fehlt für Punkt "${trackpoint.id}".`
      )
    }
  })

  payload.sessionEvents.forEach((event) => {
    if (!availableSessionIds.has(event.sessionId)) {
      issues.push(`sessionEvents: sessionId "${event.sessionId}" fehlt für Ereignis "${event.id}".`)
    }
  })

  payload.workSessions.forEach((session) => {
    if (session.herdId && !availableHerdIds.has(session.herdId)) {
      issues.push(`workSessions: herdId "${session.herdId}" fehlt für Einsatz "${session.id}".`)
    }

    if (session.enclosureId && !availableEnclosureIds.has(session.enclosureId)) {
      issues.push(
        `workSessions: enclosureId "${session.enclosureId}" fehlt für Einsatz "${session.id}".`
      )
    }
  })

  payload.workEvents.forEach((event) => {
    if (!availableWorkSessionIds.has(event.workSessionId)) {
      issues.push(
        `workEvents: workSessionId "${event.workSessionId}" fehlt für Ereignis "${event.id}".`
      )
    }
  })
}

function getClearKeys(meta: ImportPreviewMeta, replaceExisting: boolean) {
  if (!replaceExisting) {
    return []
  }

  const onlyLimitedTables =
    meta.presentKeys.length > 0 &&
    meta.presentKeys.every((key) => limitedReplaceKeys.has(key))

  if (onlyLimitedTables) {
    return [...meta.presentKeys]
  }

  if (meta.isCompleteAppData) {
    return [...importPayloadKeys]
  }

  throw new Error(
    '`Ersetzen` ist nur mit vollständigem App-Export oder reinem Untersuchungsflächen-/Settings-Import möglich.'
  )
}

function summarizeIssues(issues: string[]) {
  const uniqueIssues = [...new Set(issues)]
  const preview = uniqueIssues.slice(0, 8).join(' | ')

  if (uniqueIssues.length <= 8) {
    return preview
  }

  return `${preview} | +${uniqueIssues.length - 8} weitere`
}

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

  const payload = {
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
  }

  if (payload.settings.length > 1) {
    payload.settings = [payload.settings[payload.settings.length - 1]]
  }

  ensureNoDuplicateIds('herds', payload.herds, issues)
  ensureNoDuplicateIds('animals', payload.animals, issues)
  ensureNoDuplicateIds('enclosures', payload.enclosures, issues)
  ensureNoDuplicateIds('surveyAreas', payload.surveyAreas, issues)
  ensureNoDuplicateIds('enclosureAssignments', payload.enclosureAssignments, issues)
  ensureNoDuplicateIds('grazingSessions', payload.grazingSessions, issues)
  ensureNoDuplicateIds('trackpoints', payload.trackpoints, issues)
  ensureNoDuplicateIds('sessionEvents', payload.sessionEvents, issues)
  ensureNoDuplicateIds('workSessions', payload.workSessions, issues)
  ensureNoDuplicateIds('workEvents', payload.workEvents, issues)
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
