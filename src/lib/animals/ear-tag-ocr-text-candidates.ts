import type { KnownEarTagMatch } from '@/lib/animals/ear-tag-ocr-types'
import { normalizeEarTagText } from '@/lib/animals/ear-tag-ocr-text-normalization'

const LOCAL_PREFIX_BONUS = new Set(['IT', 'AT', 'DE', 'CH', 'SI'])

const prefixCorrectionMap: Record<string, string[]> = {
  '0': ['O', 'Q'],
  '1': ['I', 'L'],
  '2': ['Z'],
  '4': ['A'],
  '5': ['S'],
  '6': ['G'],
  '7': ['T'],
  '8': ['B'],
}

const bodyCorrectionMap: Record<string, string[]> = {
  O: ['0'],
  Q: ['0'],
  D: ['0'],
  I: ['1'],
  L: ['1'],
  Z: ['2'],
  S: ['5'],
  G: ['6'],
  T: ['7'],
  B: ['8'],
}

export function scoreKnownEarTagMatch(match: KnownEarTagMatch | null) {
  if (!match) {
    return 0
  }

  return match.relationship === 'exact' ? 9 : 3
}

export function scoreEarTagCandidate(value: string) {
  let score = value.length

  if (value.length >= 6) score += 4
  if (value.length >= 10) score += 3
  if (/\d{4,}/.test(value)) score += 4
  if (/^[A-Z]{1,3}\d/.test(value)) score += 2
  if (/^[A-Z]{1,3}\d{6,15}$/.test(value)) score += 8
  if (/^\d{8,15}$/.test(value)) score += 7
  if (/^[A-Z]{0,3}\d{1,4}[/-]\d{4,}$/.test(value)) score += 4
  if (/^\d+$/.test(value)) score += 1
  if (!/\d/.test(value)) score -= 10
  if (/^[A-Z]{4,}$/.test(value)) score -= 8
  if (value.length < 5) score -= 4
  if (value.length > 18) score -= 3

  return score
}

function suggestionPatternBonus(value: string) {
  let bonus = 0
  const prefix = value.match(/^[A-Z]{2,3}/)?.[0] ?? ''

  if (/^[A-Z]{2}\d{10,14}$/.test(value)) bonus += 4
  if (/^[A-Z]{1,3}\d{6,15}$/.test(value)) bonus += 2
  if (/^\d{10,15}$/.test(value)) bonus += 2
  if (prefix && LOCAL_PREFIX_BONUS.has(prefix.slice(0, 2))) bonus += 2

  return bonus
}

export function scoreRecognitionCandidate(candidate: string, confidence: number) {
  if (!candidate) {
    return -1
  }

  return scoreEarTagCandidate(candidate) + suggestionPatternBonus(candidate) + confidence / 10
}

function hasMappedCorrection(map: Record<string, string[]>, value: string) {
  return Object.prototype.hasOwnProperty.call(map, value)
}

function replaceCharacterAt(value: string, index: number, nextCharacter: string) {
  return `${value.slice(0, index)}${nextCharacter}${value.slice(index + 1)}`
}

function isPotentialPrefixChar(value: string) {
  return /[A-Z]/.test(value) || hasMappedCorrection(prefixCorrectionMap, value)
}

export function extractSuggestionSeeds(rawText: string) {
  return Array.from(
    new Set(
      [rawText, ...rawText.split(/\s+/), ...rawText.split(/[^A-Z0-9/-]+/)]
        .map((value) => value.trim())
        .filter(Boolean)
    )
  )
}

function expandConfusableVariants(
  compactValue: string,
  prefixLength: number,
  maxSubstitutions = 2
) {
  const queue: Array<{ value: string; substitutions: number; nextIndex: number }> = [
    {
      value: compactValue,
      substitutions: 0,
      nextIndex: 0,
    },
  ]
  const bestSubstitutions = new Map<string, number>([[compactValue, 0]])

  while (queue.length) {
    const current = queue.shift()

    if (!current || current.substitutions >= maxSubstitutions) {
      continue
    }

    for (let index = current.nextIndex; index < current.value.length; index += 1) {
      const currentCharacter = current.value[index]
      const correctionMap = index < prefixLength ? prefixCorrectionMap : bodyCorrectionMap
      const replacements = correctionMap[currentCharacter] ?? []

      for (const replacement of replacements) {
        const nextValue = replaceCharacterAt(current.value, index, replacement)
        const nextSubstitutions = current.substitutions + 1
        const existingSubstitutions = bestSubstitutions.get(nextValue)

        if (
          existingSubstitutions !== undefined &&
          existingSubstitutions <= nextSubstitutions
        ) {
          continue
        }

        bestSubstitutions.set(nextValue, nextSubstitutions)
        queue.push({
          value: nextValue,
          substitutions: nextSubstitutions,
          nextIndex: index + 1,
        })
      }
    }
  }

  return Array.from(bestSubstitutions.entries()).map(([value, substitutions]) => ({
    value,
    substitutions,
  }))
}

export function buildSuggestionVariants(seed: string) {
  const normalizedSeed = normalizeEarTagText(seed).replace(/[-/]+/g, '')

  if (!normalizedSeed) {
    return []
  }

  const hypotheses = new Set<number>([0])
  const leadingLetters = normalizedSeed.match(/^[A-Z]{1,3}/)?.[0].length ?? 0

  if (leadingLetters) {
    hypotheses.add(Math.min(3, leadingLetters))
  }

  if (normalizedSeed.length >= 7 && isPotentialPrefixChar(normalizedSeed[0])) {
    hypotheses.add(1)
  }

  if (
    normalizedSeed.length >= 8 &&
    normalizedSeed.slice(0, 2).split('').every(isPotentialPrefixChar)
  ) {
    hypotheses.add(2)
  }

  if (
    normalizedSeed.length >= 9 &&
    normalizedSeed.slice(0, 3).split('').every(isPotentialPrefixChar)
  ) {
    hypotheses.add(3)
  }

  const ranked = new Map<string, number>()

  for (const prefixLength of hypotheses) {
    if (normalizedSeed.length <= prefixLength + 4) {
      continue
    }

    const variants = expandConfusableVariants(normalizedSeed, prefixLength)

    for (const variant of variants) {
      const isValid =
        prefixLength === 0
          ? /^\d{8,15}$/.test(variant.value)
          : new RegExp(`^[A-Z]{${prefixLength}}\\d{6,15}$`).test(variant.value)

      if (!isValid) {
        continue
      }

      const existingSubstitutions = ranked.get(variant.value)

      if (
        existingSubstitutions === undefined ||
        variant.substitutions < existingSubstitutions
      ) {
        ranked.set(variant.value, variant.substitutions)
      }
    }
  }

  return Array.from(ranked.entries()).map(([value, substitutions]) => ({
    value,
    substitutions,
  }))
}
