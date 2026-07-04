import { z } from 'zod'
import { defaultAppSettings, normalizeMapBaseLayer } from '@/lib/settings/defaults'
import { resolveGpsMaxSpeedMps } from '@/lib/settings/gps-presets'
import {
  optionalNumber,
  optionalTrimmedString,
} from '@/lib/import-export/import-validation-shared-schemas'
import type { AppSettings } from '@/types/domain'

export const settingsRecordSchema = z
  .object({
    id: z.string().optional(),
    userName: optionalTrimmedString,
    mapBaseLayer: z.string().optional(),
    gpsAccuracyThresholdM: optionalNumber,
    gpsMinTimeS: optionalNumber,
    gpsMinDistanceM: optionalNumber,
    gpsMaxSpeedMps: optionalNumber,
    tileCachingEnabled: z.boolean().optional(),
    theme: z.enum(['system', 'light']).optional(),
  })
  .transform((value): AppSettings => {
    const gpsAccuracyThresholdM = Math.max(
      1,
      Math.round(value.gpsAccuracyThresholdM ?? defaultAppSettings.gpsAccuracyThresholdM)
    )
    const gpsMinTimeS = Math.max(
      1,
      Math.round(value.gpsMinTimeS ?? defaultAppSettings.gpsMinTimeS)
    )
    const gpsMinDistanceM = Math.max(
      1,
      Math.round(value.gpsMinDistanceM ?? defaultAppSettings.gpsMinDistanceM)
    )

    return {
      id: 'app',
      userName: value.userName ?? defaultAppSettings.userName,
      language: 'de',
      mapBaseLayer: normalizeMapBaseLayer(value.mapBaseLayer),
      gpsAccuracyThresholdM,
      gpsMinTimeS,
      gpsMinDistanceM,
      gpsMaxSpeedMps: resolveGpsMaxSpeedMps(
        {
          gpsAccuracyThresholdM,
          gpsMinTimeS,
          gpsMinDistanceM,
          gpsMaxSpeedMps: value.gpsMaxSpeedMps,
        },
        defaultAppSettings.gpsMaxSpeedMps
      ),
      tileCachingEnabled: value.tileCachingEnabled ?? defaultAppSettings.tileCachingEnabled,
      theme: value.theme ?? defaultAppSettings.theme,
    }
  })
