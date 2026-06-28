import type { AppSettings } from '@/types/domain'

export type GpsPresetId = 'precise' | 'standard' | 'longTour'

export type GpsTuning = Pick<
  AppSettings,
  'gpsAccuracyThresholdM' | 'gpsMinTimeS' | 'gpsMinDistanceM'
>

export type GpsPreset = GpsTuning & {
  id: GpsPresetId
  label: string
  description: string
}

// Ordered most-precise → most battery-saving. The geolocation watcher reads
// these three fields live (via getPositionDecision), so switching preset changes
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
  },
  {
    id: 'standard',
    label: 'Standard',
    description: 'Ausgewogen für normale Weidegänge.',
    gpsAccuracyThresholdM: 25,
    gpsMinTimeS: 5,
    gpsMinDistanceM: 5,
  },
  {
    id: 'longTour',
    label: 'Lange Tour',
    description: 'Akku sparen: seltenere Punkte für ganztägige Touren.',
    gpsAccuracyThresholdM: 40,
    gpsMinTimeS: 20,
    gpsMinDistanceM: 15,
  },
]

/** The three tunable GPS fields of a preset, ready to merge into settings. */
export function getGpsTuning(preset: GpsPreset): GpsTuning {
  return {
    gpsAccuracyThresholdM: preset.gpsAccuracyThresholdM,
    gpsMinTimeS: preset.gpsMinTimeS,
    gpsMinDistanceM: preset.gpsMinDistanceM,
  }
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
      preset.gpsMinDistanceM === settings.gpsMinDistanceM,
  )

  return match?.id ?? null
}
