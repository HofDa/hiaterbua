export type GuideTone = 'good' | 'warn' | 'alert'

export type OcrPassResult = {
  text: string
  confidence: number
}

export type CaptureGuide = {
  label: string
  detail: string
  tone: GuideTone
}

export type KnownEarTagMatch = {
  canonical: string
  relationship: 'exact' | 'digits'
}

export type EarTagSuggestion = {
  value: string
  score: number
  confidence: number
  substitutions: number
  knownMatch: KnownEarTagMatch | null
}

export type KnownEarTagIndex = {
  exact: Map<string, string>
  trailingDigits: Map<string, string>
}

export const ocrInitialMessage =
  'Foto aufnehmen, dann wird die Ohrmarke automatisch gelesen.'
export const OCR_FRAME_WIDTH_RATIO = 0.58
export const OCR_FRAME_HEIGHT_RATIO = 0.22

export const defaultCaptureGuides: CaptureGuide[] = [
  {
    label: 'Ohrmarke in den Rahmen',
    detail: 'Tag möglichst allein und frontal zeigen',
    tone: 'warn',
  },
  {
    label: 'Kurz ruhig halten',
    detail: 'Dann erst auslösen',
    tone: 'warn',
  },
]
