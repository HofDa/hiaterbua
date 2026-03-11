import type {
  EarTagSuggestion,
  KnownEarTagIndex,
  OcrPassResult,
} from '@/lib/animals/ear-tag-ocr-types'
import {
  buildEarTagVariants,
  buildSuggestionVariants,
  extractSuggestionSeeds,
  findKnownEarTagMatch,
  scoreEarTagCandidate,
  scoreKnownEarTagMatch,
  scoreRecognitionCandidate,
} from '@/lib/animals/ear-tag-ocr-text-core'

export function describeRecognitionMessage(suggestion: EarTagSuggestion) {
  if (
    suggestion.confidence >= 75 &&
    suggestion.substitutions <= 1 &&
    scoreEarTagCandidate(suggestion.value) >= 18
  ) {
    return 'Ohrmarke klar erkannt. Bitte kurz prüfen.'
  }

  if (suggestion.confidence >= 52 && suggestion.substitutions <= 2) {
    return 'Ohrmarke wahrscheinlich erkannt. Bitte genau prüfen.'
  }

  return 'Unsicheres OCR-Ergebnis. Bitte sorgfältig prüfen oder neu fotografieren.'
}

export function buildRankedEarTagSuggestions(
  results: OcrPassResult[],
  knownEarTagIndex: KnownEarTagIndex | null = null
) {
  const ranked = new Map<string, EarTagSuggestion>()

  for (const result of results) {
    for (const seed of extractSuggestionSeeds(result.text)) {
      for (const baseVariant of buildEarTagVariants(seed)) {
        for (const suggestion of buildSuggestionVariants(baseVariant)) {
          const knownMatch = findKnownEarTagMatch(suggestion.value, knownEarTagIndex)
          const nextScore =
            scoreRecognitionCandidate(suggestion.value, result.confidence) -
            suggestion.substitutions * 1.75 +
            scoreKnownEarTagMatch(knownMatch)

          if (nextScore < 12) {
            continue
          }

          const existing = ranked.get(suggestion.value)

          if (!existing || nextScore > existing.score) {
            ranked.set(suggestion.value, {
              value: suggestion.value,
              score: nextScore,
              confidence: result.confidence,
              substitutions: suggestion.substitutions,
              knownMatch,
            })
          }
        }
      }
    }
  }

  return Array.from(ranked.values())
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      if (right.confidence !== left.confidence) return right.confidence - left.confidence
      if (left.substitutions !== right.substitutions) return left.substitutions - right.substitutions
      return left.value.localeCompare(right.value)
    })
    .slice(0, 4)
}
