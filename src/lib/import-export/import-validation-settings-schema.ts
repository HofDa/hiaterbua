import { z } from 'zod'
import { defaultAppSettings, normalizeMapBaseLayer } from '@/lib/settings/defaults'
import {
  optionalNumber,
  optionalTrimmedString,
} from '@/lib/import-export/import-validation-shared-schemas'
import type { AppSettings } from '@/types/domain'

export const settingsRecordSchema = z
  .object({
    id: z.string().optional(),
    userName: optionalTrimmedString,
    accessPasswordHash: optionalTrimmedString,
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
    userName: value.userName ?? defaultAppSettings.userName,
    accessPasswordHash: value.accessPasswordHash ?? defaultAppSettings.accessPasswordHash,
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
