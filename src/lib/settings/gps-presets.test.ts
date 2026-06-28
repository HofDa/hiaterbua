import { describe, expect, it } from 'vitest'
import { defaultAppSettings } from '@/lib/settings/defaults'
import {
  getGpsTuning,
  gpsPresets,
  matchGpsPreset,
  type GpsTuning,
} from '@/lib/settings/gps-presets'

describe('gpsPresets', () => {
  it('exposes the three named presets, ordered precise → battery-saving', () => {
    expect(gpsPresets.map((preset) => preset.id)).toEqual(['precise', 'standard', 'longTour'])

    // A higher minimum time/distance means fewer fixes accepted = less battery.
    for (let index = 1; index < gpsPresets.length; index += 1) {
      expect(gpsPresets[index].gpsMinTimeS).toBeGreaterThan(gpsPresets[index - 1].gpsMinTimeS)
      expect(gpsPresets[index].gpsMinDistanceM).toBeGreaterThan(
        gpsPresets[index - 1].gpsMinDistanceM,
      )
    }
  })

  it('keeps the Standard preset aligned with the app defaults', () => {
    expect(matchGpsPreset(defaultAppSettings)).toBe('standard')
  })
})

describe('getGpsTuning', () => {
  it('returns only the three tunable GPS fields', () => {
    const longTour = gpsPresets.find((preset) => preset.id === 'longTour')!
    expect(getGpsTuning(longTour)).toEqual({
      gpsAccuracyThresholdM: longTour.gpsAccuracyThresholdM,
      gpsMinTimeS: longTour.gpsMinTimeS,
      gpsMinDistanceM: longTour.gpsMinDistanceM,
    })
  })
})

describe('matchGpsPreset', () => {
  it('identifies an exact preset match', () => {
    const longTour = gpsPresets.find((preset) => preset.id === 'longTour')!
    expect(matchGpsPreset(getGpsTuning(longTour))).toBe('longTour')
  })

  it('returns null for hand-tuned values that match no preset', () => {
    const custom: GpsTuning = {
      gpsAccuracyThresholdM: 30,
      gpsMinTimeS: 7,
      gpsMinDistanceM: 9,
    }
    expect(matchGpsPreset(custom)).toBeNull()
  })

  it('requires all three fields to match, not just one', () => {
    const standard = gpsPresets.find((preset) => preset.id === 'standard')!
    expect(
      matchGpsPreset({ ...getGpsTuning(standard), gpsMinTimeS: standard.gpsMinTimeS + 1 }),
    ).toBeNull()
  })
})
