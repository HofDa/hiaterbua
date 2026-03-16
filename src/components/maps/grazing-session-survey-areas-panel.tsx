'use client'

import { formatDateTime } from '@/lib/maps/grazing-session-map-helpers'
import { SurveyAreasPanel } from '@/components/maps/survey-areas-panel'
import type { SurveyArea } from '@/types/domain'

type GrazingSessionSurveyAreasPanelProps = {
  safeSurveyAreas: SurveyArea[]
  selectedSurveyArea: SurveyArea | null
  selectedSurveyAreaId: string | null
  onFocusSurveyArea: (surveyArea: SurveyArea) => void
}

export function GrazingSessionSurveyAreasPanel({
  safeSurveyAreas,
  selectedSurveyArea,
  selectedSurveyAreaId,
  onFocusSurveyArea,
}: GrazingSessionSurveyAreasPanelProps) {
  return (
    <SurveyAreasPanel
      className="mt-4"
      description="Importierte Flächen können für die Orientierung auf der Karte ein- oder ausgeblendet und direkt fokussiert werden."
      safeSurveyAreas={safeSurveyAreas}
      selectedSurveyArea={selectedSurveyArea}
      selectedSurveyAreaId={selectedSurveyAreaId}
      onFocusSurveyArea={onFocusSurveyArea}
      formatUpdatedAt={formatDateTime}
    />
  )
}
