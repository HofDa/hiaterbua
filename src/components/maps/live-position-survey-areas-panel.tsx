'use client'

import { formatDate } from '@/lib/maps/live-position-map-helpers'
import { SurveyAreasPanel } from '@/components/maps/survey-areas-panel'
import type { SurveyArea } from '@/types/domain'

type LivePositionSurveyAreasPanelProps = {
  safeSurveyAreas: SurveyArea[]
  selectedSurveyArea: SurveyArea | null
  selectedSurveyAreaId: string | null
  onFocusSurveyArea: (surveyArea: SurveyArea) => void
}

export function LivePositionSurveyAreasPanel({
  safeSurveyAreas,
  selectedSurveyArea,
  selectedSurveyAreaId,
  onFocusSurveyArea,
}: LivePositionSurveyAreasPanelProps) {
  return (
    <SurveyAreasPanel
      description="Importierte Kontroll- oder Untersuchungsflächen können hier fokussiert und auf der Karte ein- oder ausgeblendet werden."
      safeSurveyAreas={safeSurveyAreas}
      selectedSurveyArea={selectedSurveyArea}
      selectedSurveyAreaId={selectedSurveyAreaId}
      onFocusSurveyArea={onFocusSurveyArea}
      formatUpdatedAt={formatDate}
    />
  )
}
