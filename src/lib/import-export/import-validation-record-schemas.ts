import { z } from 'zod'
import {
  enclosureGeometrySchema,
  getAreaMetrics,
  nonEmptyString,
  nullableInteger,
  nullableNumber,
  nullableTrimmedString,
  optionalNumber,
  optionalTrimmedString,
  surveyGeometrySchema,
  timestampString,
} from '@/lib/import-export/import-validation-shared-schemas'
import type {
  Animal,
  Enclosure,
  EnclosureAssignment,
  Herd,
  SurveyArea,
} from '@/types/domain'

export const herdSchema = z
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

export const animalSchema = z
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

export const enclosureSchema = z
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

export const surveyAreaSchema = z
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

export const enclosureAssignmentSchema = z
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
