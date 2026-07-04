import { describe, expect, it } from 'vitest'
import { defaultAppSettings } from '@/lib/settings/defaults'
import {
  getGpsTuning,
  gpsPresets,
  matchGpsPreset,
  resolveGpsMaxSpeedMps,
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
  it('returns only the tunable GPS fields', () => {
    const longTour = gpsPresets.find((preset) => preset.id === 'longTour')!
    expect(getGpsTuning(longTour)).toEqual({
      gpsAccuracyThresholdM: longTour.gpsAccuracyThresholdM,
      gpsMinTimeS: longTour.gpsMinTimeS,
      gpsMinDistanceM: longTour.gpsMinDistanceM,
      gpsMaxSpeedMps: longTour.gpsMaxSpeedMps,
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
      gpsMaxSpeedMps: 6,
    }
    expect(matchGpsPreset(custom)).toBeNull()
  })

  it('requires every GPS field to match, not just one', () => {
    const standard = gpsPresets.find((preset) => preset.id === 'standard')!
    expect(
      matchGpsPreset({ ...getGpsTuning(standard), gpsMinTimeS: standard.gpsMinTimeS + 1 }),
    ).toBeNull()
  })

  it('requires the speed cap to match as part of a preset', () => {
    const standard = gpsPresets.find((preset) => preset.id === 'standard')!
    expect(
      matchGpsPreset({
        ...getGpsTuning(standard),
        gpsMaxSpeedMps: standard.gpsMaxSpeedMps + 1,
      }),
    ).toBeNull()
  })
})

describe('resolveGpsMaxSpeedMps', () => {
  it('preserves an explicit custom speed cap', () => {
    expect(
      resolveGpsMaxSpeedMps(
        {
          gpsAccuracyThresholdM: 15,
          gpsMinTimeS: 2,
          gpsMinDistanceM: 2,
          gpsMaxSpeedMps: 9,
        },
        defaultAppSettings.gpsMaxSpeedMps
      )
    ).toBe(9)
  })

  it('infers the speed cap for legacy settings that match a three-field preset', () => {
    const precise = gpsPresets.find((preset) => preset.id === 'precise')!

    expect(
      resolveGpsMaxSpeedMps(
        {
          gpsAccuracyThresholdM: precise.gpsAccuracyThresholdM,
          gpsMinTimeS: precise.gpsMinTimeS,
          gpsMinDistanceM: precise.gpsMinDistanceM,
        },
        defaultAppSettings.gpsMaxSpeedMps
      )
    ).toBe(precise.gpsMaxSpeedMps)
  })
})
