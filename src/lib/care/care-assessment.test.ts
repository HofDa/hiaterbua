import { describe, expect, it } from 'vitest'
import {
  evaluateCareAssessment,
  evaluateCareTargets,
  type CareAssessmentInput,
} from './care-assessment'

const baseCompleteInput: CareAssessmentInput = {
  habitatType: 'semi_dry_grassland',
  use: 'fits',
  openSoil: 'none',
  traffic: 'low',
  nutrients: 'none',
  protectedPlants: 'none',
  scrub: 'not_checked',
  litter: 'not_checked',
  nutrientInputMode: 'avoid',
  openSoilMode: 'not_desired',
  hasProtectedPlants: false,
  hasScrubReductionTarget: false,
  hasLitterReductionTarget: false,
}

describe('evaluateCareAssessment rules engine', () => {
  it('returns green with complete observations matching goals', () => {
    const result = evaluateCareAssessment({ ...baseCompleteInput })
    expect(result.status).toBe('green')
    expect(result.findings).toHaveLength(0)
  })

  // 1. vegetation 75 %, scrub 25 % remain independent
  it('1. vegetation 75 % and scrub 25 % remain independent in targets check', () => {
    const result = evaluateCareTargets({
      habitatType: 'semi_dry_grassland',
      vegetationUse: {
        targetPercent: 75,
      },
      scrubReduction: {
        targetPercent: 25,
      },
    })
    expect(result.status).toBe('plausible')
    expect(result.notes.some((n) => n.includes('100 %'))).toBe(false)
  })

  // 2. vegetation fits + scrub too_low -> yellow if scrub reduction is required
  it('2. vegetation fits + scrub too_low -> yellow if scrub reduction is required', () => {
    const result = evaluateCareAssessment({
      ...baseCompleteInput,
      use: 'fits',
      scrub: 'too_low',
      hasScrubReductionTarget: true,
    })
    expect(result.status).toBe('yellow')
    const scrubFinding = result.findings.find((f) => f.objective === 'scrubReduction')
    expect(scrubFinding).toBeDefined()
    expect(scrubFinding?.status).toBe('yellow')
    expect(scrubFinding?.actions.length).toBeGreaterThan(0)
  })

  // 3. scrub too_low ignored when scrub reduction is not configured
  it('3. scrub too_low ignored when scrub reduction is not configured', () => {
    const result = evaluateCareAssessment({
      ...baseCompleteInput,
      use: 'fits',
      scrub: 'too_low',
      hasScrubReductionTarget: false,
    })
    expect(result.status).toBe('green')
    expect(result.findings.some((f) => f.objective === 'scrubReduction')).toBe(false)
  })

  // 4. punctual open soil + punctual desired -> green/neutral
  it('4. punctual open soil + punctual desired -> green/neutral', () => {
    const result = evaluateCareAssessment({
      ...baseCompleteInput,
      openSoil: 'punctual',
      openSoilMode: 'punctual_desired',
    })
    expect(result.status).toBe('green')
    expect(result.findings.some((f) => f.objective === 'openSoil')).toBe(false)
  })

  // 5. too much open soil -> red
  it('5. too much open soil -> red', () => {
    const result = evaluateCareAssessment({
      ...baseCompleteInput,
      openSoil: 'too_much',
      openSoilMode: 'punctual_desired',
    })
    expect(result.status).toBe('red')
    const soilFinding = result.findings.find((f) => f.objective === 'openSoil')
    expect(soilFinding?.status).toBe('red')
  })

  // 6. nutrient concentration + nutrient avoidance -> yellow
  it('6. nutrient concentration + nutrient avoidance -> yellow', () => {
    const result = evaluateCareAssessment({
      ...baseCompleteInput,
      nutrients: 'localized',
      nutrientInputMode: 'avoid',
    })
    expect(result.status).toBe('yellow')
    const nutrientFinding = result.findings.find((f) => f.objective === 'nutrientInput')
    expect(nutrientFinding?.status).toBe('yellow')
  })

  // 7. nutrient concentration ignored or informational when nutrient input is explicitly acceptable
  it('7. nutrient concentration ignored when nutrient input is explicitly acceptable', () => {
    const result = evaluateCareAssessment({
      ...baseCompleteInput,
      nutrients: 'localized',
      nutrientInputMode: 'desired',
    })
    expect(result.status).toBe('green')
    expect(result.findings.some((f) => f.objective === 'nutrientInput')).toBe(false)
  })

  // 8. protected plant damage -> red
  it('8. protected plant damage -> red', () => {
    const result = evaluateCareAssessment({
      ...baseCompleteInput,
      hasProtectedPlants: true,
      protectedPlants: 'damaged',
    })
    expect(result.status).toBe('red')
    const plantFinding = result.findings.find((f) => f.objective === 'protectedPlants')
    expect(plantFinding?.status).toBe('red')
  })

  // 9. protected plant uncertain -> yellow
  it('9. protected plant uncertain -> yellow', () => {
    const result = evaluateCareAssessment({
      ...baseCompleteInput,
      hasProtectedPlants: true,
      protectedPlants: 'uncertain',
    })
    expect(result.status).toBe('yellow')
    const plantFinding = result.findings.find((f) => f.objective === 'protectedPlants')
    expect(plantFinding?.status).toBe('yellow')
  })

  // 10. unanswered required question cannot produce green
  it('10. unanswered required question cannot produce green', () => {
    const missingUseResult = evaluateCareAssessment({
      ...baseCompleteInput,
      use: null,
    })
    expect(missingUseResult.status).not.toBe('green')
    expect(missingUseResult.status).toBe('yellow')

    const missingScrubResult = evaluateCareAssessment({
      ...baseCompleteInput,
      hasScrubReductionTarget: true,
      scrub: null,
    })
    expect(missingScrubResult.status).not.toBe('green')
    expect(missingScrubResult.status).toBe('yellow')
  })

  // 11. strong trampling / erosion -> red
  it('11. strong trampling / erosion -> red', () => {
    const result = evaluateCareAssessment({
      ...baseCompleteInput,
      traffic: 'strong',
    })
    expect(result.status).toBe('red')
    const soilFinding = result.findings.find((f) => f.objective === 'openSoil')
    expect(soilFinding?.status).toBe('red')
    expect(soilFinding?.actions.join(' ')).toContain('entlasten')
  })

  // 12. litter not reduced -> yellow only when litter reduction is enabled
  it('12. litter not reduced -> yellow only when litter reduction is enabled', () => {
    const activeLitterResult = evaluateCareAssessment({
      ...baseCompleteInput,
      hasLitterReductionTarget: true,
      litter: 'insufficient',
    })
    expect(activeLitterResult.status).toBe('yellow')
    expect(activeLitterResult.findings.some((f) => f.objective === 'litterReduction')).toBe(true)

    const disabledLitterResult = evaluateCareAssessment({
      ...baseCompleteInput,
      hasLitterReductionTarget: false,
      litter: 'insufficient',
    })
    expect(disabledLitterResult.status).toBe('green')
    expect(disabledLitterResult.findings.some((f) => f.objective === 'litterReduction')).toBe(false)
  })

  it('includes reason, affected objective, and practical actions on all findings', () => {
    const result = evaluateCareAssessment({
      ...baseCompleteInput,
      nutrients: 'localized',
      nutrientInputMode: 'avoid',
    })
    expect(result.findings.length).toBeGreaterThan(0)
    for (const f of result.findings) {
      expect(f.reason).toBeTruthy()
      expect(f.objective).toBe('nutrientInput')
      expect(f.actions.length).toBeGreaterThan(0)
    }
  })
})
