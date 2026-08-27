import type { CareGoalId } from './care-guide'

export type CareFieldQuestionId =
  | 'use'
  | 'traffic'
  | 'nutrients'
  | 'scrub'
  | 'protected_plants'

export function getCareFieldQuestionIds({
  goals,
  protectedPlantCount,
}: {
  goals: readonly CareGoalId[]
  protectedPlantCount: number
}): CareFieldQuestionId[] {
  const questions: CareFieldQuestionId[] = ['use', 'traffic', 'nutrients']

  if (goals.includes('reduce_scrub')) {
    questions.push('scrub')
  }

  if (goals.includes('protect_plants') || protectedPlantCount > 0) {
    questions.push('protected_plants')
  }

  return questions
}
