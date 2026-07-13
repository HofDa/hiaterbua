import { describe, expect, it } from 'vitest'
import { buildFilteredEnclosures } from './live-position-map-enclosure-stats'
import type { EnclosureStats } from './live-position-map-helper-types'
import type { Enclosure, EnclosureAssignment } from '@/types/domain'

function enclosure(id: string, name: string): Enclosure {
  return {
    id,
    name,
    method: 'draw',
    geometry: null,
    areaM2: 10_000,
    areaHa: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function assignment(
  enclosureId: string,
  startTime: string,
): EnclosureAssignment {
  return {
    id: `assignment_${enclosureId}`,
    enclosureId,
    herdId: `herd_${enclosureId}`,
    startTime,
    endTime: null,
    createdAt: startTime,
    updatedAt: startTime,
  }
}

function stats(lastEndTime: string | null, totalAssignments = 1): EnclosureStats {
  return {
    totalAssignments,
    totalDurationS: 0,
    averageCount: null,
    lastEndTime,
    uniqueHerdsCount: totalAssignments > 0 ? 1 : 0,
  }
}

describe('buildFilteredEnclosures', () => {
  const enclosures = [
    enclosure('occupied_new', 'Besetzt neu'),
    enclosure('free_recent', 'Frei neu'),
    enclosure('never_used', 'Noch nie'),
    enclosure('occupied_old', 'Besetzt alt'),
    enclosure('free_old', 'Frei alt'),
  ]
  const activeAssignments = new Map([
    [
      'occupied_new',
      assignment('occupied_new', '2026-07-12T08:00:00.000Z'),
    ],
    [
      'occupied_old',
      assignment('occupied_old', '2026-07-01T08:00:00.000Z'),
    ],
  ])
  const enclosureStats = new Map([
    ['free_recent', stats('2026-07-10T08:00:00.000Z')],
    ['never_used', stats(null, 0)],
    ['free_old', stats('2026-06-01T08:00:00.000Z')],
  ])

  it('puts occupied enclosures first and orders them by longest occupancy', () => {
    const result = buildFilteredEnclosures(
      enclosures,
      activeAssignments,
      enclosureStats,
      'all',
    )

    expect(result.map((item) => item.enclosure.id)).toEqual([
      'occupied_old',
      'occupied_new',
      'never_used',
      'free_old',
      'free_recent',
    ])
  })

  it('returns only occupied enclosures for the active filter', () => {
    const result = buildFilteredEnclosures(
      enclosures,
      activeAssignments,
      enclosureStats,
      'active',
    )

    expect(result.map((item) => item.enclosure.id)).toEqual(['occupied_old', 'occupied_new'])
  })

  it('returns never-used and longest-rested enclosures first for the free filter', () => {
    const result = buildFilteredEnclosures(
      enclosures,
      activeAssignments,
      enclosureStats,
      'free',
    )

    expect(result.map((item) => item.enclosure.id)).toEqual([
      'never_used',
      'free_old',
      'free_recent',
    ])
  })
})
