import { describe, expect, it } from 'vitest'
import {
  buildFieldSafetySnapshot,
  emptyFieldSafetySnapshot,
  isFieldOperationActive,
} from '@/lib/field-safety/field-safety-state'

describe('isFieldOperationActive', () => {
  it('is false when no field operation source is active', () => {
    expect(isFieldOperationActive(emptyFieldSafetySnapshot)).toBe(false)
  })

  it('is true for active work, grazing, GPS, and recovery sources', () => {
    expect(isFieldOperationActive(buildFieldSafetySnapshot(['work-session']))).toBe(true)
    expect(isFieldOperationActive(buildFieldSafetySnapshot(['grazing-session']))).toBe(true)
    expect(isFieldOperationActive(buildFieldSafetySnapshot(['gps-recording']))).toBe(true)
    expect(isFieldOperationActive(buildFieldSafetySnapshot(['session-recovery']))).toBe(true)
  })
})
