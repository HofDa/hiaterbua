'use client'

import { formatArea } from '@/lib/maps/map-core'
import { formatDateTime } from '@/lib/maps/grazing-session-map-helpers'
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
    <div className="mt-4 rounded-[1.25rem] bg-[#fffdf6] px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-neutral-950">Untersuchungsflächen</h2>
        <span className="text-sm text-neutral-500">{safeSurveyAreas.length}</span>
      </div>
      <p className="mt-2 text-sm text-neutral-700">
        Importierte Flächen können für die Orientierung auf der Karte ein- oder ausgeblendet und
        direkt fokussiert werden.
      </p>

      {selectedSurveyArea ? (
        <div className="mt-3 rounded-2xl border border-[#d2cbc0] bg-[#efe4c8] px-4 py-3 text-sm text-[#17130f]">
          Fokus: <span className="font-medium">{selectedSurveyArea.name}</span> ·{' '}
          {formatArea(selectedSurveyArea.areaM2)}
        </div>
      ) : null}

      {safeSurveyAreas.length === 0 ? (
        <div className="mt-3 text-sm text-neutral-600">Noch keine Untersuchungsflächen importiert.</div>
      ) : (
        <div className="mt-3 space-y-2">
          {safeSurveyAreas.slice(0, 8).map((surveyArea) => (
            <div
              key={surveyArea.id}
              className={[
                'rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-3 py-3',
                selectedSurveyAreaId === surveyArea.id
                  ? 'border-[#d2cbc0] bg-[#efe4c8]'
                  : 'border-[#ccb98a] bg-[#fffdf6]',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-neutral-900">{surveyArea.name}</div>
                  <div className="mt-1 text-xs text-neutral-600">
                    {formatArea(surveyArea.areaM2)} · {formatDateTime(surveyArea.updatedAt)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onFocusSurveyArea(surveyArea)}
                  className="rounded-full border border-[#ccb98a] bg-[#fffdf6] px-3 py-2 text-xs font-semibold text-neutral-950 shadow-sm"
                >
                  Fokus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
