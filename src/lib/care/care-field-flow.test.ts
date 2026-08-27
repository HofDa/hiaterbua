import { describe, expect, it } from 'vitest'
import { getCareFieldQuestionIds } from './care-field-flow'

describe('getCareFieldQuestionIds', () => {
  it('keeps the routine field check to the three core observations by default', () => {
    expect(
      getCareFieldQuestionIds({
        goals: ['use_grass_herbs', 'keep_structure'],
        protectedPlantCount: 0,
      }),
    ).toEqual(['use', 'traffic', 'nutrients'])
  })

  it('adds shrub browsing only when it matters for the care plan', () => {
    expect(
      getCareFieldQuestionIds({
        goals: ['reduce_scrub'],
        protectedPlantCount: 0,
      }),
    ).toContain('scrub')
  })

  it('adds the protected-plant question for a goal or an entered target plant', () => {
    expect(
      getCareFieldQuestionIds({
        goals: ['protect_plants'],
        protectedPlantCount: 0,
      }),
    ).toContain('protected_plants')

    expect(
      getCareFieldQuestionIds({
        goals: ['use_grass_herbs'],
        protectedPlantCount: 1,
      }),
    ).toContain('protected_plants')
  })

  it('never exceeds five observations', () => {
    const questions = getCareFieldQuestionIds({
      goals: ['use_grass_herbs', 'reduce_scrub', 'protect_plants', 'avoid_nutrients'],
      protectedPlantCount: 3,
    })

    expect(questions).toHaveLength(5)
    expect(new Set(questions).size).toBe(questions.length)
  })
})
