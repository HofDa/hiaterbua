import { describe, expect, it } from 'vitest'
import {
  findAssignmentConflict,
  isActiveEnclosure,
  selectActiveAssignments,
} from './enclosure-rules'
import type { Enclosure, EnclosureAssignment } from '@/types/domain'

function makeEnclosure(overrides: Partial<Enclosure> = {}): Enclosure {
  return {
    id: 'enclosure_1',
    name: 'Almwiese',
    method: 'draw',
    geometry: null,
    areaM2: 0,
    areaHa: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeAssignment(overrides: Partial<EnclosureAssignment> = {}): EnclosureAssignment {
  return {
    id: 'assignment_1',
    enclosureId: 'enclosure_1',
    herdId: 'herd_1',
    startTime: '2026-01-01T00:00:00.000Z',
    endTime: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('isActiveEnclosure', () => {
  it('treats an enclosure with no supersededAt as active', () => {
    expect(isActiveEnclosure(makeEnclosure())).toBe(true)
    expect(isActiveEnclosure(makeEnclosure({ supersededAt: null }))).toBe(true)
  })

  it('treats a superseded enclosure as inactive', () => {
    expect(isActiveEnclosure(makeEnclosure({ supersededAt: '2026-02-01T00:00:00.000Z' }))).toBe(
      false,
    )
  })
})

describe('selectActiveAssignments', () => {
  it('keeps only assignments without an end time', () => {
    const open = makeAssignment({ id: 'open', endTime: null })
    const closed = makeAssignment({ id: 'closed', endTime: '2026-01-02T00:00:00.000Z' })

    expect(selectActiveAssignments([open, closed])).toEqual([open])
  })
})

describe('findAssignmentConflict', () => {
  it('allows an assignment when nothing else is open', () => {
    expect(findAssignmentConflict([], 'enclosure_1', 'herd_1')).toBeNull()
  })

  it('blocks when the enclosure is already occupied', () => {
    const active = [makeAssignment({ enclosureId: 'enclosure_1', herdId: 'herd_other' })]

    expect(findAssignmentConflict(active, 'enclosure_1', 'herd_1')).toBe('enclosure-occupied')
  })

  it('blocks when the herd is already assigned to a different enclosure', () => {
    const active = [makeAssignment({ enclosureId: 'enclosure_other', herdId: 'herd_1' })]

    expect(findAssignmentConflict(active, 'enclosure_1', 'herd_1')).toBe('herd-assigned-elsewhere')
  })

  it('reports the enclosure conflict first when both would apply', () => {
    const active = [
      makeAssignment({ id: 'a', enclosureId: 'enclosure_1', herdId: 'herd_other' }),
      makeAssignment({ id: 'b', enclosureId: 'enclosure_other', herdId: 'herd_1' }),
    ]

    expect(findAssignmentConflict(active, 'enclosure_1', 'herd_1')).toBe('enclosure-occupied')
  })
})
