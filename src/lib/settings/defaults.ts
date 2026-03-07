import type { AppSettings } from '@/types/domain'

export const defaultAppSettings: AppSettings = {
  id: 'app',
  language: 'de',
  mapBaseLayer: 'south-tyrol-orthophoto-2023',
  gpsAccuracyThresholdM: 25,
  gpsMinTimeS: 5,
  gpsMinDistanceM: 5,
  tileCachingEnabled: false,
  theme: 'system',
}

export function normalizeMapBaseLayer(value: string | null | undefined): AppSettings['mapBaseLayer'] {
  if (value === 'south-tyrol-basemap' || value === 'south-tyrol-orthophoto-2023') {
    return value
  }

  if (value === 'bozen-ortho' || value === 'ortho') {
    return 'south-tyrol-orthophoto-2023'
  }

  return 'south-tyrol-basemap'
}
