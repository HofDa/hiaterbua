import { describe, expect, it } from 'vitest'
import { getCareFieldQuestionIds } from './care-field-flow'

describe('getCareFieldQuestionIds', () => {
  it('keeps the routine field check to the three core observations by default', () => {
    expect(
      getCareFieldQuestionIds({
        hasScrubReductionTarget: false,
        hasProtectedPlants: false,
      }),
    ).toEqual(['use', 'traffic', 'nutrients'])
  })

  it('adds shrub browsing only when scrub reduction target is set', () => {
    expect(
      getCareFieldQuestionIds({
        hasScrubReductionTarget: true,
        hasProtectedPlants: false,
      }),
    ).toContain('scrub')
  })

  it('adds litter question only when litter reduction target is set', () => {
    expect(
      getCareFieldQuestionIds({
        hasScrubReductionTarget: false,
        hasProtectedPlants: false,
        hasLitterReductionTarget: true,
      }),
    ).toContain('litter')
  })

  it('adds the protected-plant question when protected plants exist', () => {
    expect(
      getCareFieldQuestionIds({
        hasScrubReductionTarget: false,
        hasProtectedPlants: true,
      }),
    ).toContain('protected_plants')
  })

  it('includes all relevant observations when all targets are enabled', () => {
    const questions = getCareFieldQuestionIds({
      hasScrubReductionTarget: true,
      hasProtectedPlants: true,
      hasLitterReductionTarget: true,
    })

    expect(questions).toHaveLength(6)
    expect(new Set(questions).size).toBe(questions.length)
  })
})
