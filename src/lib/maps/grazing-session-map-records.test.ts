import { describe, expect, it } from 'vitest'
import { buildTrackpointsFromEditableTrackpoints } from './grazing-session-map-records'
import type { EditableTrackPoint } from '@/lib/maps/grazing-session-map-helper-types'
import type { TrackPoint } from '@/types/domain'

function makeEditable(overrides: Partial<EditableTrackPoint> = {}): EditableTrackPoint {
  return {
    lat: 46.5,
    lon: 11.3,
    timestamp: '2026-01-01T00:00:00.000Z',
    accuracyM: 4,
    speedMps: 1.2,
    headingDeg: 90,
    ...overrides,
  }
}

function makeTrackpoint(overrides: Partial<TrackPoint> = {}): TrackPoint {
  return {
    id: 'trackpoint_existing',
    sessionId: 'session_1',
    enclosureWalkId: null,
    seq: 1,
    timestamp: '2026-01-01T00:00:00.000Z',
    lat: 0,
    lon: 0,
    accepted: true,
    ...overrides,
  }
}

describe('buildTrackpointsFromEditableTrackpoints', () => {
  it('returns an empty list for no points', () => {
    expect(buildTrackpointsFromEditableTrackpoints([], 'session_1')).toEqual([])
  })

  it('stamps the session id, resequences from 1, and maps every field', () => {
    const editable = [
      makeEditable({ lat: 46.1, lon: 11.1, timestamp: 't1' }),
      makeEditable({ lat: 46.2, lon: 11.2, timestamp: 't2', speedMps: null, headingDeg: null }),
    ]

    const result = buildTrackpointsFromEditableTrackpoints(editable, 'session_42')

    expect(result.map((point) => point.seq)).toEqual([1, 2])
    expect(result.every((point) => point.sessionId === 'session_42')).toBe(true)
    expect(result.every((point) => point.enclosureWalkId === null)).toBe(true)
    expect(result.every((point) => point.accepted)).toBe(true)
    expect(result[1]).toMatchObject({
      lat: 46.2,
      lon: 11.2,
      timestamp: 't2',
      speedMps: null,
      headingDeg: null,
    })
  })

  it('reuses existing trackpoint ids positionally and mints ids for added points', () => {
    const existing = [
      makeTrackpoint({ id: 'kept_a' }),
      makeTrackpoint({ id: 'kept_b' }),
    ]
    const editable = [makeEditable(), makeEditable(), makeEditable()]

    const result = buildTrackpointsFromEditableTrackpoints(editable, 'session_1', existing)

    expect(result[0].id).toBe('kept_a')
    expect(result[1].id).toBe('kept_b')
    expect(result[2].id).not.toBe('kept_a')
    expect(result[2].id).not.toBe('kept_b')
    expect(result[2].id.length).toBeGreaterThan(0)
  })
})
