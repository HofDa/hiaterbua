'use client'

import Image from 'next/image'
import type { EarTagSuggestion, KnownEarTagMatch } from '@/lib/animals/ear-tag-ocr'
import type { CameraStep } from '@/components/animals/ear-tag-scan-types'
import { Card, CardContent } from '@/components/ui/card'
import { FormField, FormLabel, FormInput, FormButton } from '@/components/ui/form'
import { Alert, StatusAlert, ErrorAlert } from '@/components/ui/alert'

type EarTagScanResultCardProps = {
  disabled: boolean
  isReadingOcr: boolean
  cameraStep: CameraStep
  effectiveDraft: string
  cleanedDraft: string
  ocrMessage: string
  ocrError: string
  ocrPreviewUrl: string | null
  ocrSuggestions: EarTagSuggestion[]
  ocrProgress: number
  selectedKnownConflict: KnownEarTagMatch | null
  onDraftChange: (value: string) => void
  onApplyDraft: () => void
}

export function EarTagScanResultCard({
  disabled,
  isReadingOcr,
  cameraStep,
  effectiveDraft,
  cleanedDraft,
  ocrMessage,
  ocrError,
  ocrPreviewUrl,
  ocrSuggestions,
  ocrProgress,
  selectedKnownConflict,
  onDraftChange,
  onApplyDraft,
}: EarTagScanResultCardProps) {
  return (
    <Card>
      <CardContent>
        {ocrPreviewUrl ? (
          <div className="mb-4 overflow-hidden rounded-[1.1rem] border border-[#d8ccb2] bg-[#f3ede0]">
            <div className="border-b border-[#d8ccb2] px-3 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-neutral-700">
              OCR-Fokus
            </div>
            <div className="relative aspect-[3/1] bg-[#f7f2e7]">
              <Image
                src={ocrPreviewUrl}
                alt="Vorbereiteter OCR-Ausschnitt"
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          </div>
        ) : null}

        <FormField>
          <FormLabel>Scan-Ergebnis</FormLabel>
          <FormInput
            value={effectiveDraft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="erkannte oder manuell korrigierte Ohrmarke"
            disabled={disabled || isReadingOcr}
          />
        </FormField>
        <div className="mt-2 text-sm text-neutral-700">{ocrMessage}</div>

      {selectedKnownConflict && (
        <Alert className="mt-3 rounded-[1rem] border border-[#d9b37a] bg-[#fbf2dd] text-sm font-medium text-[#5e4320]">
          {selectedKnownConflict.relationship === 'exact'
            ? `Diese Ohrmarke ist bereits in der Datenbank vorhanden: ${selectedKnownConflict.canonical}`
            : `Der erkannte Ziffernblock passt zu einer vorhandenen Ohrmarke: ${selectedKnownConflict.canonical}`}
        </Alert>
      )}

      {ocrSuggestions.length ? (
        <div className="mt-4">
          <div className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-neutral-700">
            OCR-Vorschläge
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {ocrSuggestions.map((suggestion, index) => {
              const isActive = effectiveDraft === suggestion.value

              return (
                <button
                  key={suggestion.value}
                  type="button"
                  onClick={() => onDraftChange(suggestion.value)}
                  disabled={disabled || isReadingOcr}
                  className={[
                    'rounded-full border px-3 py-2 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50',
                    isActive
                      ? 'border-[#17392c] bg-[#e6efe9] text-[#17392c]'
                      : 'border-[#ccb98a] bg-[#f7f2e7] text-neutral-900',
                  ].join(' ')}
                >
                  {suggestion.value}
                  <span className="ml-2 text-[0.65rem] uppercase tracking-[0.12em] text-neutral-600">
                    {suggestion.knownMatch?.relationship === 'exact'
                      ? 'DB'
                      : index === 0
                        ? 'OCR'
                        : suggestion.substitutions > 0
                          ? `${suggestion.substitutions} Korr.`
                          : 'Alt'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {isReadingOcr ? (
        <div className="mt-3 overflow-hidden rounded-full border border-[#d8ccb2] bg-[#f3ede0]">
          <div
            className="h-2 rounded-full bg-[#17392c] transition-all"
            style={{ width: `${Math.max(8, Math.round(ocrProgress * 100))}%` }}
          />
        </div>
      ) : null}

      {ocrError && (
        <ErrorAlert className="mt-3">{ocrError}</ErrorAlert>
      )}
      {cameraStep === 'captured' && !ocrError && (
        <Alert className="mt-3 rounded-[1rem] border border-[#d8ccb2] bg-[#f7f2e7] text-sm text-neutral-700">
          Erstes OCR kann etwas länger dauern, weil Sprachdaten einmalig geladen und lokal gecacht werden.
        </Alert>
      )}

      <FormButton
        type="button"
        onClick={onApplyDraft}
        disabled={disabled || !cleanedDraft}
        variant="primary"
        className="mt-3"
      >
        In Ohrmarke übernehmen
      </FormButton>
      </CardContent>
    </Card>
  )
}
