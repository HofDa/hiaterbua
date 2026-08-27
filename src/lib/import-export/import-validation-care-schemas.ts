import { z } from 'zod'
import {
  localRecordMetadataSchemaFields,
  nonEmptyString,
  normalizeLocalRecordMetadata,
  optionalTrimmedString,
  timestampString,
} from '@/lib/import-export/import-validation-shared-schemas'
import type { CareMonitoringCheck, ConservationPlan } from '@/types/domain'

const habitatTypeSchema = z.enum([
  'dry_grassland',
  'semi_dry_grassland',
  'nardus_grassland',
  'productive_pasture',
  'dwarf_shrub_heath',
  'wood_pasture',
  'other',
])

const targetPercentSchema = z.union([
  z.literal(25),
  z.literal(50),
  z.literal(75),
  z.literal(100),
])

function cleanStringArray(items: unknown[]): string[] {
  const result: string[] = []
  for (const item of items) {
    const str =
      typeof item === 'string'
        ? item.trim()
        : typeof item === 'object' && item !== null && 'name' in item
          ? String(item.name).trim()
          : ''
    if (str && !result.some((existing) => existing.toLowerCase() === str.toLowerCase())) {
      result.push(str)
    }
  }
  return result
}

const stringListSchema = z.array(z.unknown()).transform(cleanStringArray)

const vegetationUseSchema = z.object({
  targetPercent: targetPercentSchema,
  protectedPlants: stringListSchema.default([]),
  manualRemovalPlants: stringListSchema.default([]),
})

const litterReductionSchema = z.object({
  enabled: z.boolean().default(false),
  note: optionalTrimmedString,
})

const scrubReductionSchema = z.object({
  targetPercent: targetPercentSchema.nullable().optional(),
  protectedWoodyPlants: stringListSchema.default([]),
  manualRemovalWoodyPlants: stringListSchema.default([]),
})

const openSoilSchema = z.object({
  mode: z.enum(['not_desired', 'punctual_desired']).default('not_desired'),
  maxPercent: z.number().min(0).max(100).optional(),
  note: optionalTrimmedString,
})

const nutrientInputSchema = z.object({
  mode: z.enum(['avoid', 'desired']).default('avoid'),
  note: optionalTrimmedString,
})

const careFindingSchema = z.object({
  status: z.enum(['yellow', 'red']),
  reason: nonEmptyString,
  objective: z.enum([
    'vegetationUse',
    'litterReduction',
    'scrubReduction',
    'openSoil',
    'nutrientInput',
    'protectedPlants',
  ]),
  actions: z.array(nonEmptyString),
})

export const careMonitoringCheckSchema = z
  .object({
    id: nonEmptyString,
    conservationPlanId: nonEmptyString,
    enclosureId: nonEmptyString,
    grazingSessionId: z.string().trim().min(1).nullable().optional(),
    observedAt: timestampString,
    observations: z.object({
      vegetationUse: z.enum(['too_low', 'fits', 'too_high']).nullable(),
      litterReduction: z.enum(['insufficient', 'fits', 'not_checked']).nullable(),
      scrubReduction: z.enum(['too_low', 'fits', 'too_high', 'not_checked']).nullable(),
      openSoil: z.enum(['none', 'punctual', 'too_much']).nullable(),
      traffic: z.enum(['low', 'spotty', 'strong']).nullable(),
      nutrientConcentration: z.enum(['none', 'localized', 'strong']).nullable(),
      protectedPlants: z.enum(['none', 'uncertain', 'unsure', 'damaged']).nullable(),
    }),
    assessment: z.object({
      status: z.enum(['green', 'yellow', 'red']),
      findings: z.array(careFindingSchema),
      actions: z.array(nonEmptyString),
    }),
    assessmentVersion: z.literal(1).default(1),
    planSnapshot: z.object({
      habitatType: habitatTypeSchema,
      vegetationUse: vegetationUseSchema,
      litterReduction: litterReductionSchema,
      scrubReduction: scrubReductionSchema,
      openSoil: openSoilSchema,
      nutrientInput: nutrientInputSchema,
    }),
    note: optionalTrimmedString,
    createdAt: timestampString,
    updatedAt: timestampString,
    ...localRecordMetadataSchemaFields,
  })
  .transform((value): CareMonitoringCheck => ({
    id: value.id,
    conservationPlanId: value.conservationPlanId,
    enclosureId: value.enclosureId,
    grazingSessionId: value.grazingSessionId ?? null,
    observedAt: value.observedAt,
    observations: value.observations,
    assessment: value.assessment,
    assessmentVersion: value.assessmentVersion,
    planSnapshot: {
      ...value.planSnapshot,
      scrubReduction: {
        ...value.planSnapshot.scrubReduction,
        targetPercent: value.planSnapshot.scrubReduction.targetPercent ?? null,
      },
    },
    ...(value.note !== undefined ? { note: value.note } : {}),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    ...normalizeLocalRecordMetadata(value),
  }))

const legacyCareGoalSchema = z.enum([
  'use_grass_herbs',
  'reduce_thatch',
  'reduce_scrub',
  'keep_structure',
  'create_open_soil',
  'protect_plants',
  'avoid_nutrients',
])

export const conservationPlanSchema = z
  .object({
    id: nonEmptyString,
    enclosureId: nonEmptyString,
    habitatType: habitatTypeSchema,
    vegetationUse: vegetationUseSchema.optional(),
    litterReduction: litterReductionSchema.optional(),
    scrubReduction: scrubReductionSchema.optional(),
    openSoil: openSoilSchema.optional(),
    nutrientInput: nutrientInputSchema.optional(),
    goals: z.array(legacyCareGoalSchema).optional(),
    targetUsePercent: targetPercentSchema.optional(),
    protectedPlants: z.array(z.unknown()).optional(),
    notes: optionalTrimmedString,
    createdAt: timestampString,
    updatedAt: timestampString,
    ...localRecordMetadataSchemaFields,
  })
  .refine(
    (data) => data.vegetationUse !== undefined || data.targetUsePercent !== undefined,
    {
      message: 'ConservationPlan muss entweder vegetationUse oder targetUsePercent definieren.',
    },
  )
  .transform((value): ConservationPlan => {
    let vegetationUse = value.vegetationUse
    let litterReduction = value.litterReduction
    let scrubReduction = value.scrubReduction
    let openSoil = value.openSoil
    let nutrientInput = value.nutrientInput

    const legacyGoals = value.goals ?? []

    if (!vegetationUse) {
      const targetPercent = value.targetUsePercent ?? 75
      const protectedPlants = value.protectedPlants ? cleanStringArray(value.protectedPlants) : []
      vegetationUse = {
        targetPercent,
        protectedPlants,
        manualRemovalPlants: [],
      }
    }

    if (!litterReduction) {
      litterReduction = {
        enabled: legacyGoals.includes('reduce_thatch'),
      }
    }

    if (!scrubReduction) {
      scrubReduction = {
        targetPercent: null,
        protectedWoodyPlants: [],
        manualRemovalWoodyPlants: [],
      }
    }

    if (!openSoil) {
      openSoil = {
        mode: legacyGoals.includes('create_open_soil') ? 'punctual_desired' : 'not_desired',
      }
    }

    if (!nutrientInput) {
      nutrientInput = {
        mode: legacyGoals.includes('avoid_nutrients') ? 'avoid' : 'desired',
      }
    }

    return {
      id: value.id,
      enclosureId: value.enclosureId,
      habitatType: value.habitatType,
      vegetationUse,
      litterReduction: {
        enabled: litterReduction.enabled,
        ...(litterReduction.note !== undefined ? { note: litterReduction.note } : {}),
      },
      scrubReduction: {
        targetPercent: scrubReduction.targetPercent ?? null,
        protectedWoodyPlants: scrubReduction.protectedWoodyPlants,
        manualRemovalWoodyPlants: scrubReduction.manualRemovalWoodyPlants,
      },
      openSoil: {
        mode: openSoil.mode,
        ...(openSoil.maxPercent !== undefined ? { maxPercent: openSoil.maxPercent } : {}),
        ...(openSoil.note !== undefined ? { note: openSoil.note } : {}),
      },
      nutrientInput: {
        mode: nutrientInput.mode,
        ...(nutrientInput.note !== undefined ? { note: nutrientInput.note } : {}),
      },
      ...(value.notes !== undefined ? { notes: value.notes } : {}),
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
      ...normalizeLocalRecordMetadata(value),
    }
  })
