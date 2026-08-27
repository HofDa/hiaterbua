import { describe, expect, it } from 'vitest'
import { buildGpsStatusText } from '@/lib/maps/gps-status-text'
import { defaultAppSettings } from '@/lib/settings/defaults'
import type { GpsPosition } from '@/lib/maps/position-types'

const position: GpsPosition = {
  latitude: 46.5,
  longitude: 11.35,
  accuracy: 12,
  timestamp: 1_700_000_000_000,
}

const baseOptions = {
  gpsState: 'tracking' as const,
  position,
  lastPositionDecision: null,
  settings: defaultAppSettings,
  acceptedFilterDetail: 'Letzter Punkt wurde übernommen.',
}

describe('buildGpsStatusText', () => {
  it('reports the live accuracy while tracking', () => {
    const text = buildGpsStatusText(baseOptions)

    expect(text.gpsLabel).toBe('GPS aktiv')
    expect(text.gpsDetail).toContain('Genauigkeit ca.')
    expect(text.gpsFilterDetail).toBe('GPS-Filter noch ohne Entscheidung.')
  })

  it('appends the last known accuracy to every non-tracking state', () => {
    const text = buildGpsStatusText({ ...baseOptions, gpsState: 'denied' })

    expect(text.gpsLabel).toBe('GPS nicht erlaubt')
    expect(text.gpsDetail).toContain('Standortfreigabe')
    expect(text.gpsDetail).toContain('Letzte Genauigkeit:')
  })

  it('omits the accuracy suffix before the first fix arrives', () => {
    const text = buildGpsStatusText({ ...baseOptions, gpsState: 'error', position: null })

    expect(text.gpsLabel).toBe('GPS Fehler')
    expect(text.gpsDetail).not.toContain('Letzte Genauigkeit:')
  })

  it('quotes the configured threshold for each rejection reason', () => {
    const reject = (reason: 'accuracy' | 'time' | 'distance' | 'speed') =>
      buildGpsStatusText({
        ...baseOptions,
        lastPositionDecision: { accepted: false, reason },
      }).gpsFilterDetail

    expect(reject('accuracy')).toContain(`${defaultAppSettings.gpsAccuracyThresholdM} m`)
    expect(reject('time')).toContain(`${defaultAppSettings.gpsMinTimeS} s`)
    expect(reject('distance')).toContain(`${defaultAppSettings.gpsMinDistanceM} m`)
    expect(reject('speed')).toContain(`${defaultAppSettings.gpsMaxSpeedMps} m/s`)
  })

  it('falls back to the reasonable speed ceiling when none is configured', () => {
    const text = buildGpsStatusText({
      ...baseOptions,
      settings: { ...defaultAppSettings, gpsMaxSpeedMps: null as unknown as number },
      lastPositionDecision: { accepted: false, reason: 'speed' },
    })

    expect(text.gpsFilterDetail).toContain('7 m/s')
  })

  it('uses the caller-supplied wording for an accepted fix', () => {
    const text = buildGpsStatusText({
      ...baseOptions,
      lastPositionDecision: { accepted: true, reason: 'accepted' },
    })

    expect(text.gpsFilterDetail).toBe('Letzter Punkt wurde übernommen.')
  })
})
