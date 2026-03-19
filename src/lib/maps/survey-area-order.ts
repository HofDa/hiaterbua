import type { SurveyArea } from '@/types/domain'

const surveyAreaIdCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})

export function sortSurveyAreasByImportOrder(areas: SurveyArea[]): SurveyArea[] {
  return [...areas].sort((left, right) => {
    const idDiff = surveyAreaIdCollator.compare(left.id, right.id)

    if (idDiff !== 0) return idDiff

    return surveyAreaIdCollator.compare(left.name, right.name)
  })
}
