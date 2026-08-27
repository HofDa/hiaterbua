export type CareFieldQuestionId =
  | 'use'
  | 'traffic'
  | 'nutrients'
  | 'litter'
  | 'scrub'
  | 'protected_plants'

export function getCareFieldQuestionIds({
  hasScrubReductionTarget,
  hasProtectedPlants,
  hasLitterReductionTarget,
}: {
  hasScrubReductionTarget: boolean
  hasProtectedPlants: boolean
  hasLitterReductionTarget?: boolean
}): CareFieldQuestionId[] {
  const questions: CareFieldQuestionId[] = ['use', 'traffic', 'nutrients']

  if (hasLitterReductionTarget) {
    questions.push('litter')
  }

  if (hasScrubReductionTarget) {
    questions.push('scrub')
  }

  if (hasProtectedPlants) {
    questions.push('protected_plants')
  }

  return questions
}
