import { z } from 'zod'
import {
  localRecordMetadataSchemaFields,
  nonEmptyString,
  normalizeLocalRecordMetadata,
  optionalTrimmedString,
  timestampString,
} from '@/lib/import-export/import-validation-shared-schemas'
import type { ConservationPlan } from '@/types/domain'

const habitatTypeSchema = z.enum([
  'dry_grassland',
  'semi_dry_grassland',
  'nardus_grassland',
  'productive_pasture',
  'dwarf_shrub_heath',
  'wood_pasture',
  'other',
])

const careGoalSchema = z.enum([
  'use_grass_herbs',
  'reduce_thatch',
  'reduce_scrub',
  'keep_structure',
  'create_open_soil',
  'protect_plants',
  'avoid_nutrients',
])

const careTargetUsePercentSchema = z.union([
  z.literal(25),
  z.literal(50),
  z.literal(75),
  z.literal(100),
])

const carePlantReferenceSchema = z.object({
  name: nonEmptyString,
})

export const conservationPlanSchema = z
  .object({
    id: nonEmptyString,
    enclosureId: nonEmptyString,
    habitatType: habitatTypeSchema,
    goals: z.array(careGoalSchema).min(1),
    targetUsePercent: careTargetUsePercentSchema,
    protectedPlants: z.array(carePlantReferenceSchema),
    notes: optionalTrimmedString,
    createdAt: timestampString,
    updatedAt: timestampString,
    ...localRecordMetadataSchemaFields,
  })
  .transform((value): ConservationPlan => ({
    id: value.id,
    enclosureId: value.enclosureId,
    habitatType: value.habitatType,
    goals: [...new Set(value.goals)],
    targetUsePercent: value.targetUsePercent,
    protectedPlants: value.protectedPlants,
    notes: value.notes,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    ...normalizeLocalRecordMetadata(value),
  }))
