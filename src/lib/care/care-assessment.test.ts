import { describe, expect, it } from 'vitest'
import { evaluateCareAssessment, evaluateCareTargets } from './care-assessment'

const base = {
  habitatType: 'semi_dry_grassland' as const,
  goals: ['use_grass_herbs', 'keep_structure', 'avoid_nutrients'] as const,
  use: 'fits' as const,
  traffic: 'low' as const,
  nutrients: 'none' as const,
  protectedPlants: 'none' as const,
  scrub: 'not_checked' as const,
}

describe('evaluateCareAssessment', () => {
  it('returns green when observed effects match the goals', () => {
    const result = evaluateCareAssessment({ ...base, goals: [...base.goals] })
    expect(result.status).toBe('green')
  })

  it('treats strong trampling as red', () => {
    const result = evaluateCareAssessment({
      ...base,
      goals: [...base.goals],
      traffic: 'strong',
    })
    expect(result.status).toBe('red')
    expect(result.actions.join(' ')).toContain('entlasten')
  })

  it('accepts spotty open soil when it is an explicit goal', () => {
    const result = evaluateCareAssessment({
      ...base,
      goals: [...base.goals, 'create_open_soil'],
      traffic: 'spotty',
    })
    expect(result.status).toBe('green')
  })

  it('warns about localized nutrient concentration on nutrient-sensitive habitat', () => {
    const result = evaluateCareAssessment({
      ...base,
      goals: ['use_grass_herbs'],
      nutrients: 'localized',
    })
    expect(result.status).toBe('yellow')
  })

  it('marks damage to protected plants as red', () => {
    const result = evaluateCareAssessment({
      ...base,
      goals: ['protect_plants'],
      protectedPlants: 'damaged',
    })
    expect(result.status).toBe('red')
  })
})


describe('evaluateCareTargets', () => {
  it('flags 100 percent use with structure diversity as a conflict to review', () => {
    const result = evaluateCareTargets({
      habitatType: 'semi_dry_grassland',
      goals: ['use_grass_herbs', 'keep_structure'],
      targetUsePercent: 100,
    })
    expect(result.status).toBe('review')
  })

  it('keeps ordinary mixed goals plausible while explaining nutrient sensitivity', () => {
    const result = evaluateCareTargets({
      habitatType: 'nardus_grassland',
      goals: ['use_grass_herbs'],
      targetUsePercent: 75,
    })
    expect(result.status).toBe('plausible')
    expect(result.notes.join(' ')).toContain('Kot und Urin')
  })
})
