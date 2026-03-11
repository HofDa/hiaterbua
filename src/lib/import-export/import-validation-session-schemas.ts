import { z } from 'zod'
import {
  nonEmptyString,
  nullableInteger,
  nullableNumber,
  nullableTrimmedString,
  optionalNumber,
  optionalTrimmedString,
  timestampString,
} from '@/lib/import-export/import-validation-shared-schemas'
import type {
  GrazingSession,
  SessionEvent,
  TrackPoint,
  WorkEvent,
  WorkSession,
} from '@/types/domain'

export const grazingSessionSchema = z
  .object({
    id: nonEmptyString,
    herdId: nonEmptyString,
    animalCount: nullableInteger.optional(),
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
    animalCount: value.animalCount ?? null,
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

export const trackPointSchema = z
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

export const sessionEventSchema = z
  .object({
    id: nonEmptyString,
    sessionId: nonEmptyString,
    timestamp: timestampString,
    type: z.enum([
      'water',
      'rest',
      'move',
      'disturbance',
      'note',
      'start',
      'pause',
      'resume',
      'stop',
    ]),
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

export const workSessionSchema = z
  .object({
    id: nonEmptyString,
    type: z.enum([
      'herding',
      'driving',
      'fence',
      'control',
      'water',
      'transport',
      'other',
    ]),
    activityId: z
      .enum([
        'guided_access_to_grazing_animals',
        'guided_lead_grazing_animals',
        'guided_herd_grazing_animals',
        'guided_collect_grazing_animals',
        'guided_fence_work',
        'guided_overnight_fence_work',
        'guided_material_shift',
        'guided_check_grazing_animals',
        'guided_check_lambing',
        'guided_check_herding_dogs',
        'guided_check_guard_dogs',
        'guided_brush_clearing_with_grazers',
        'guided_detangling',
        'guided_follow_up_grazing',
        'guided_fence_work_for_brush_clearing',
        'guided_trampling_via_overdrive',
      ])
      .nullable()
      .optional(),
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
    activityId: value.activityId ?? null,
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

export const workEventSchema = z
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
