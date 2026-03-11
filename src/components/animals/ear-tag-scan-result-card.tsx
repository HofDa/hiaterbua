'use client'

import Image from 'next/image'
import type { EarTagSuggestion, KnownEarTagMatch } from '@/lib/animals/ear-tag-ocr'
import type { CameraStep } from '@/components/animals/ear-tag-scan-types'

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
    <div className="rounded-[1.2rem] border border-[#ccb98a] bg-[#fffdf6] p-4 shadow-sm">
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

      <label className="mb-1 block text-sm font-medium text-neutral-900">Scan-Ergebnis</label>
      <input
        className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
        value={effectiveDraft}
        onChange={(event) => onDraftChange(event.target.value)}
        placeholder="erkannte oder manuell korrigierte Ohrmarke"
        disabled={disabled || isReadingOcr}
      />
      <div className="mt-2 text-sm text-neutral-700">{ocrMessage}</div>

      {selectedKnownConflict ? (
        <div className="mt-3 rounded-[1rem] border border-[#d9b37a] bg-[#fbf2dd] px-4 py-3 text-sm font-medium text-[#5e4320]">
          {selectedKnownConflict.relationship === 'exact'
            ? `Diese Ohrmarke ist bereits in der Datenbank vorhanden: ${selectedKnownConflict.canonical}`
            : `Der erkannte Ziffernblock passt zu einer vorhandenen Ohrmarke: ${selectedKnownConflict.canonical}`}
        </div>
      ) : null}

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

      {ocrError ? (
        <div className="mt-3 rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {ocrError}
        </div>
      ) : cameraStep === 'captured' ? (
        <div className="mt-3 rounded-[1rem] border border-[#d8ccb2] bg-[#f7f2e7] px-4 py-3 text-sm text-neutral-700">
          Erstes OCR kann etwas länger dauern, weil Sprachdaten einmalig geladen und lokal gecacht werden.
        </div>
      ) : null}

      <button
        type="button"
        onClick={onApplyDraft}
        disabled={disabled || !cleanedDraft}
        className="mt-3 rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-3 text-sm font-semibold text-neutral-950 shadow-sm disabled:opacity-50"
      >
        In Ohrmarke übernehmen
      </button>
    </div>
  )
}
