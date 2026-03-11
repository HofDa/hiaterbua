import type {
  KnownEarTagIndex,
  KnownEarTagMatch,
} from '@/lib/animals/ear-tag-ocr-types'

export function normalizeEarTagText(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9/-]+/g, '')
}

function normalizeEarTagCompact(value: string) {
  return normalizeEarTagText(value).replace(/[-/]+/g, '')
}

export function isSameEarTag(left: string | null | undefined, right: string | null | undefined) {
  if (!left || !right) return false
  return normalizeEarTagCompact(left) === normalizeEarTagCompact(right)
}

export function buildEarTagVariants(value: string) {
  const normalized = normalizeEarTagText(value)

  if (!normalized) {
    return []
  }

  const compact = normalized.replace(/[-/]+/g, '')
  const tokenMatches = normalized.match(/[A-Z]+|\d+/g) ?? []
  const tokensCombined = tokenMatches.join('')
  const trailingDigits = compact.match(/\d{6,}$/)?.[0] ?? ''
  const leadingCountry = compact.match(/^[A-Z]{1,3}\d{6,}$/)?.[0] ?? ''

  return Array.from(
    new Set(
      [normalized, compact, tokensCombined, trailingDigits, leadingCountry]
        .map((candidate) => candidate.trim())
        .filter(Boolean)
    )
  )
}

export function buildKnownEarTagIndex(values: string[]) {
  const exact = new Map<string, string>()
  const trailingDigits = new Map<string, string>()

  values.forEach((value) => {
    const canonical = normalizeEarTagText(value)
    const compactCanonical = normalizeEarTagCompact(canonical)

    if (!compactCanonical) {
      return
    }

    exact.set(compactCanonical, canonical)

    buildEarTagVariants(canonical).forEach((variant) => {
      const compactVariant = normalizeEarTagCompact(variant)

      if (compactVariant && !exact.has(compactVariant)) {
        exact.set(compactVariant, canonical)
      }
    })

    const trailing = compactCanonical.match(/\d{6,}$/)?.[0]

    if (trailing && !trailingDigits.has(trailing)) {
      trailingDigits.set(trailing, canonical)
    }
  })

  return { exact, trailingDigits }
}

export function findKnownEarTagMatch(
  candidate: string,
  knownEarTagIndex: KnownEarTagIndex | null
) {
  if (!knownEarTagIndex) {
    return null
  }

  const compactCandidate = normalizeEarTagCompact(candidate)

  if (!compactCandidate) {
    return null
  }

  const exactMatch = knownEarTagIndex.exact.get(compactCandidate)

  if (exactMatch) {
    return {
      canonical: exactMatch,
      relationship: 'exact' as const,
    }
  }

  const trailingDigits = compactCandidate.match(/\d{6,}$/)?.[0]

  if (!trailingDigits) {
    return null
  }

  const trailingMatch = knownEarTagIndex.trailingDigits.get(trailingDigits)

  if (!trailingMatch) {
    return null
  }

  return {
    canonical: trailingMatch,
    relationship: 'digits' as const,
  } satisfies KnownEarTagMatch
}
