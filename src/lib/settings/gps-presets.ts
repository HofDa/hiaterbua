import type { AppSettings } from '@/types/domain'

export type GpsPresetId = 'precise' | 'standard' | 'longTour'

export type GpsTuning = Pick<
  AppSettings,
  'gpsAccuracyThresholdM' | 'gpsMinTimeS' | 'gpsMinDistanceM' | 'gpsMaxSpeedMps'
>

export type GpsPreset = GpsTuning & {
  id: GpsPresetId
  label: string
  description: string
}

// Ordered most-precise → most battery-saving. The geolocation watcher reads
// these fields live (via getPositionDecision), so switching preset changes
// recording fidelity and power draw from the next accepted fix onward — the key
// lever for stretching battery across a long day on the mountain.
export const gpsPresets: GpsPreset[] = [
  {
    id: 'precise',
    label: 'Präzise',
    description: 'Pferch zeichnen, dichte Punkte. Höchster Akkuverbrauch.',
    gpsAccuracyThresholdM: 15,
    gpsMinTimeS: 2,
    gpsMinDistanceM: 2,
    gpsMaxSpeedMps: 4,
  },
  {
    id: 'standard',
    label: 'Standard',
    description: 'Ausgewogen für normale Weidegänge.',
    gpsAccuracyThresholdM: 25,
    gpsMinTimeS: 5,
    gpsMinDistanceM: 5,
    gpsMaxSpeedMps: 7,
  },
  {
    id: 'longTour',
    label: 'Lange Tour',
    description: 'Akku sparen: seltenere Punkte und höhere Geschwindigkeit für lange Touren.',
    gpsAccuracyThresholdM: 40,
    gpsMinTimeS: 20,
    gpsMinDistanceM: 15,
    gpsMaxSpeedMps: 12,
  },
]

/** The tunable GPS fields of a preset, ready to merge into settings. */
export function getGpsTuning(preset: GpsPreset): GpsTuning {
  return {
    gpsAccuracyThresholdM: preset.gpsAccuracyThresholdM,
    gpsMinTimeS: preset.gpsMinTimeS,
    gpsMinDistanceM: preset.gpsMinDistanceM,
    gpsMaxSpeedMps: preset.gpsMaxSpeedMps,
  }
}

export function resolveGpsMaxSpeedMps(
  settings: Partial<GpsTuning> | null | undefined,
  fallbackGpsMaxSpeedMps: number
) {
  if (typeof settings?.gpsMaxSpeedMps === 'number' && Number.isFinite(settings.gpsMaxSpeedMps)) {
    return Math.max(1, settings.gpsMaxSpeedMps)
  }

  const legacyPreset = gpsPresets.find(
    (preset) =>
      preset.gpsAccuracyThresholdM === settings?.gpsAccuracyThresholdM &&
      preset.gpsMinTimeS === settings?.gpsMinTimeS &&
      preset.gpsMinDistanceM === settings?.gpsMinDistanceM
  )

  return legacyPreset?.gpsMaxSpeedMps ?? fallbackGpsMaxSpeedMps
}

/**
 * The preset the current settings exactly match, or `null` when the user has
 * hand-tuned values that don't line up with any preset.
 */
export function matchGpsPreset(settings: GpsTuning): GpsPresetId | null {
  const match = gpsPresets.find(
    (preset) =>
      preset.gpsAccuracyThresholdM === settings.gpsAccuracyThresholdM &&
      preset.gpsMinTimeS === settings.gpsMinTimeS &&
      preset.gpsMinDistanceM === settings.gpsMinDistanceM &&
      preset.gpsMaxSpeedMps === settings.gpsMaxSpeedMps,
  )

  return match?.id ?? null
}
