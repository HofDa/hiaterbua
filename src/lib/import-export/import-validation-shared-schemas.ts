import { area as turfArea } from '@turf/turf'
import { z } from 'zod'
import type { ImportPayloadKey } from '@/lib/import-export/import-validation-types'
import { importPayloadKeys } from '@/lib/import-export/import-validation-types'
import type { Enclosure, SurveyArea } from '@/types/domain'

export const rawImportPayloadSchema = z
  .object(
    Object.fromEntries(importPayloadKeys.map((key) => [key, z.array(z.unknown()).optional()])) as Record<
      ImportPayloadKey,
      z.ZodOptional<z.ZodArray<z.ZodUnknown>>
    >
  )
  .passthrough()

export const nonEmptyString = z.string().trim().min(1)
export const timestampString = z.string().trim().min(1)

export const optionalTrimmedString = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}, z.string().optional())

export const nullableTrimmedString = z.preprocess((value) => {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}, z.string().nullable())

export const optionalNumber = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined
  return value
}, z.coerce.number().finite().optional())

export const nullableNumber = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return null
  return value
}, z.coerce.number().finite().nullable())

export const nullableInteger = nullableNumber.transform((value) =>
  value === null ? null : Math.round(value)
)

export const coordinateSchema = z.tuple([z.coerce.number().finite(), z.coerce.number().finite()])

export const polygonGeometrySchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(coordinateSchema).min(1)).min(1),
})

export const multiPolygonGeometrySchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(z.array(coordinateSchema).min(1)).min(1)).min(1),
})

export const enclosureGeometrySchema = z.preprocess(
  (value) => (value === undefined ? null : value),
  z.union([polygonGeometrySchema, z.null()])
)

export const surveyGeometrySchema = z.union([
  polygonGeometrySchema,
  multiPolygonGeometrySchema,
])

export function getAreaMetrics(geometry: Enclosure['geometry'] | SurveyArea['geometry']) {
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
