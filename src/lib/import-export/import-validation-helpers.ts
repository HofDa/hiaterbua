import type { ZodIssue, ZodType } from 'zod'
import type {
  Animal,
  EnclosureAssignment,
} from '@/types/domain'
import {
  importPayloadKeys,
  type ExistingImportRefs,
  type ImportPayloadKey,
  type ImportPreviewMeta,
  type PreparedImportPayload,
} from '@/lib/import-export/import-validation-types'

const limitedReplaceKeys = new Set<ImportPayloadKey>(['surveyAreas', 'settings'])

function formatSchemaIssues(
  label: string,
  index: number,
  issues: ZodIssue[]
) {
  return issues.map((issue) => {
    const path = issue.path.length > 0 ? `.${issue.path.join('.')}` : ''
    return `${label}[${index}]${path}: ${issue.message}`
  })
}

export function parseRecords<T>(
  label: ImportPayloadKey,
  records: unknown[] | undefined,
  schema: ZodType<T>,
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

export function ensureNoDuplicateIds(
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

export function ensureNoDuplicateAnimalEarTags(
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

export function validateReferences(
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

  payload.enclosureAssignments.forEach((assignment: EnclosureAssignment) => {
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

export function getClearKeys(meta: ImportPreviewMeta, replaceExisting: boolean) {
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

export function summarizeIssues(issues: string[]) {
  const uniqueIssues = [...new Set(issues)]
  const preview = uniqueIssues.slice(0, 8).join(' | ')

  if (uniqueIssues.length <= 8) {
    return preview
  }

  return `${preview} | +${uniqueIssues.length - 8} weitere`
}
