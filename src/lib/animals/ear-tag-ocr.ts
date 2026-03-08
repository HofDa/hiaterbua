type CropRect = {
  left: number
  top: number
  width: number
  height: number
}

type LiveFrameMetrics = {
  brightness: number
  contrast: number
  edgeStrength: number
  motion: number
  highlightRatio: number
  darkRatio: number
}

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

type OcrVariantMode = 'balanced' | 'adaptive' | 'shadow'

export const ocrInitialMessage =
  'Foto aufnehmen, dann wird die Ohrmarke automatisch gelesen.'
export const OCR_FRAME_WIDTH_RATIO = 0.58
export const OCR_FRAME_HEIGHT_RATIO = 0.22
const OCR_FRAME_MIN_WIDTH = 280
const OCR_FRAME_MIN_HEIGHT = 112
const LOCAL_PREFIX_BONUS = new Set(['IT', 'AT', 'DE', 'CH', 'SI'])

export const defaultCaptureGuides: CaptureGuide[] = [
  {
    label: 'Ohrmarke in den Rahmen',
    detail: 'Tag moeglichst allein und frontal zeigen',
    tone: 'warn',
  },
  {
    label: 'Kurz ruhig halten',
    detail: 'Dann erst ausloesen',
    tone: 'warn',
  },
]

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

export function describeOcrStatus(status: string) {
  switch (status) {
    case 'loading tesseract core':
      return 'OCR-Kern wird geladen'
    case 'initializing tesseract':
      return 'OCR wird initialisiert'
    case 'loading language traineddata':
      return 'Sprachdaten werden geladen'
    case 'initializing api':
      return 'OCR wird vorbereitet'
    case 'recognizing text':
      return 'Ohrmarke wird gelesen'
    default:
      return 'Ohrmarke wird vorbereitet'
  }
}

export function describeOcrError(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('failed to fetch')
    ) {
      return 'OCR-Sprachdaten konnten nicht geladen werden. Beim ersten Scan ist kurz Netz noetig.'
    }

    if (message.includes('worker')) {
      return 'OCR-Worker konnte nicht gestartet werden.'
    }
  }

  return 'Ohrmarke konnte aus dem Foto nicht gelesen werden.'
}

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

function hasMappedCorrection(map: Record<string, string[]>, value: string) {
  return Object.prototype.hasOwnProperty.call(map, value)
}

function replaceCharacterAt(value: string, index: number, nextCharacter: string) {
  return `${value.slice(0, index)}${nextCharacter}${value.slice(index + 1)}`
}

function buildOcrCropRect(width: number, height: number, paddingRatio = 0): CropRect {
  const targetWidthRatio = Math.min(0.82, OCR_FRAME_WIDTH_RATIO + paddingRatio)
  const targetHeightRatio = Math.min(0.34, OCR_FRAME_HEIGHT_RATIO + paddingRatio * 0.55)
  const cropWidth = Math.min(width, Math.max(OCR_FRAME_MIN_WIDTH, Math.round(width * targetWidthRatio)))
  const cropHeight = Math.min(height, Math.max(OCR_FRAME_MIN_HEIGHT, Math.round(height * targetHeightRatio)))

  return {
    left: Math.max(0, Math.round((width - cropWidth) / 2)),
    top: Math.max(0, Math.round((height - cropHeight) / 2)),
    width: cropWidth,
    height: cropHeight,
  }
}

function buildEarTagVariants(value: string) {
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
        .filter(Boolean),
    ),
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

export function findKnownEarTagMatch(candidate: string, knownEarTagIndex: KnownEarTagIndex | null) {
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
  }
}

function scoreKnownEarTagMatch(match: KnownEarTagMatch | null) {
  if (!match) {
    return 0
  }

  return match.relationship === 'exact' ? 9 : 3
}

function scoreEarTagCandidate(value: string) {
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

function scoreRecognitionCandidate(candidate: string, confidence: number) {
  if (!candidate) {
    return -1
  }

  return scoreEarTagCandidate(candidate) + suggestionPatternBonus(candidate) + confidence / 10
}

export function describeRecognitionMessage(suggestion: EarTagSuggestion) {
  if (
    suggestion.confidence >= 75 &&
    suggestion.substitutions <= 1 &&
    scoreEarTagCandidate(suggestion.value) >= 18
  ) {
    return 'Ohrmarke klar erkannt. Bitte kurz pruefen.'
  }

  if (suggestion.confidence >= 52 && suggestion.substitutions <= 2) {
    return 'Ohrmarke wahrscheinlich erkannt. Bitte genau pruefen.'
  }

  return 'Unsicheres OCR-Ergebnis. Bitte sorgfaeltig pruefen oder neu fotografieren.'
}

function isPotentialPrefixChar(value: string) {
  return /[A-Z]/.test(value) || hasMappedCorrection(prefixCorrectionMap, value)
}

function extractSuggestionSeeds(rawText: string) {
  return Array.from(
    new Set(
      [
        rawText,
        ...rawText.split(/\s+/),
        ...rawText.split(/[^A-Z0-9/-]+/),
      ]
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  )
}

function expandConfusableVariants(compactValue: string, prefixLength: number, maxSubstitutions = 2) {
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

function buildSuggestionVariants(seed: string) {
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

export function buildRankedEarTagSuggestions(
  results: OcrPassResult[],
  knownEarTagIndex: KnownEarTagIndex | null = null,
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

function clipByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function findHistogramThreshold(histogram: Uint32Array, percentile: number) {
  const total = histogram.reduce((sum, value) => sum + value, 0)
  const target = total * percentile
  let cumulative = 0

  for (let index = 0; index < histogram.length; index += 1) {
    cumulative += histogram[index]

    if (cumulative >= target) {
      return index
    }
  }

  return histogram.length - 1
}

function normalizeGrayscaleValues(values: Uint8ClampedArray, mode: OcrVariantMode) {
  const histogram = new Uint32Array(256)

  values.forEach((value) => {
    histogram[value] += 1
  })

  const lowPercentile = mode === 'shadow' ? 0.02 : 0.04
  const highPercentile = mode === 'shadow' ? 0.985 : 0.955
  const low = findHistogramThreshold(histogram, lowPercentile)
  const high = Math.max(low + 1, findHistogramThreshold(histogram, highPercentile))
  const gamma = mode === 'shadow' ? 0.82 : 0.96
  const normalized = new Uint8ClampedArray(values.length)

  for (let index = 0; index < values.length; index += 1) {
    const scaled = clipByte(((values[index] - low) * 255) / Math.max(1, high - low))
    normalized[index] = clipByte(255 * Math.pow(scaled / 255, gamma))
  }

  return normalized
}

function buildAdaptiveBinaryValues(
  values: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  bias: number,
) {
  const integral = new Uint32Array((width + 1) * (height + 1))

  for (let y = 1; y <= height; y += 1) {
    let rowSum = 0

    for (let x = 1; x <= width; x += 1) {
      const sourceIndex = (y - 1) * width + (x - 1)
      rowSum += values[sourceIndex]
      integral[y * (width + 1) + x] = integral[(y - 1) * (width + 1) + x] + rowSum
    }
  }

  const output = new Uint8ClampedArray(values.length)

  for (let y = 0; y < height; y += 1) {
    const top = Math.max(0, y - radius)
    const bottom = Math.min(height - 1, y + radius)

    for (let x = 0; x < width; x += 1) {
      const left = Math.max(0, x - radius)
      const right = Math.min(width - 1, x + radius)
      const sum =
        integral[(bottom + 1) * (width + 1) + (right + 1)] -
        integral[top * (width + 1) + (right + 1)] -
        integral[(bottom + 1) * (width + 1) + left] +
        integral[top * (width + 1) + left]
      const area = (right - left + 1) * (bottom - top + 1)
      const threshold = sum / area - bias
      const index = y * width + x

      output[index] = values[index] > threshold ? 255 : 0
    }
  }

  return output
}

function applyPerspectiveVariant(sourceCanvas: HTMLCanvasElement, perspectiveTilt: number) {
  const targetCanvas = document.createElement('canvas')
  targetCanvas.width = sourceCanvas.width
  targetCanvas.height = sourceCanvas.height
  const context = targetCanvas.getContext('2d')

  if (!context) {
    throw new Error('Perspective canvas unavailable')
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, targetCanvas.width, targetCanvas.height)

  for (let y = 0; y < sourceCanvas.height; y += 1) {
    const ratio = sourceCanvas.height <= 1 ? 0.5 : y / (sourceCanvas.height - 1)
    const distortion = 1 + perspectiveTilt * ((ratio - 0.5) * 2)
    const destinationWidth = Math.max(
      sourceCanvas.width * 0.72,
      Math.min(sourceCanvas.width * 1.26, sourceCanvas.width * distortion),
    )
    const destinationX = (sourceCanvas.width - destinationWidth) / 2

    context.drawImage(
      sourceCanvas,
      0,
      y,
      sourceCanvas.width,
      1,
      destinationX,
      y,
      destinationWidth,
      1,
    )
  }

  return targetCanvas
}

function applyRotationVariant(sourceCanvas: HTMLCanvasElement, rotationDeg: number) {
  const targetCanvas = document.createElement('canvas')
  targetCanvas.width = sourceCanvas.width
  targetCanvas.height = sourceCanvas.height
  const context = targetCanvas.getContext('2d')

  if (!context) {
    throw new Error('Rotation canvas unavailable')
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, targetCanvas.width, targetCanvas.height)
  context.translate(targetCanvas.width / 2, targetCanvas.height / 2)
  context.rotate((rotationDeg * Math.PI) / 180)
  context.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2)

  return targetCanvas
}

function extractOcrCropCanvas(
  sourceCanvas: HTMLCanvasElement,
  options?: {
    paddingRatio?: number
    mode?: OcrVariantMode
    rotationDeg?: number
    perspectiveTilt?: number
  },
) {
  const rect = buildOcrCropRect(
    sourceCanvas.width,
    sourceCanvas.height,
    options?.paddingRatio ?? 0,
  )
  const scale = options?.mode === 'adaptive' ? 2.75 : options?.mode === 'shadow' ? 2.55 : 2.3
  const cropCanvas = document.createElement('canvas')
  const context = cropCanvas.getContext('2d')

  if (!context) {
    throw new Error('OCR canvas unavailable')
  }

  cropCanvas.width = Math.round(rect.width * scale)
  cropCanvas.height = Math.round(rect.height * scale)

  context.drawImage(
    sourceCanvas,
    rect.left,
    rect.top,
    rect.width,
    rect.height,
    0,
    0,
    cropCanvas.width,
    cropCanvas.height,
  )

  let workingCanvas = cropCanvas

  if (options?.perspectiveTilt) {
    workingCanvas = applyPerspectiveVariant(workingCanvas, options.perspectiveTilt)
  }

  if (options?.rotationDeg) {
    workingCanvas = applyRotationVariant(workingCanvas, options.rotationDeg)
  }

  return workingCanvas
}

function prepareProcessedCrop(
  sourceCanvas: HTMLCanvasElement,
  options?: {
    paddingRatio?: number
    mode?: OcrVariantMode
    rotationDeg?: number
    perspectiveTilt?: number
  },
) {
  const workingCanvas = extractOcrCropCanvas(sourceCanvas, options)
  const context = workingCanvas.getContext('2d')

  if (!context) {
    throw new Error('OCR canvas unavailable')
  }

  const imageData = context.getImageData(0, 0, workingCanvas.width, workingCanvas.height)
  const pixels = imageData.data
  const grayscale = new Uint8ClampedArray(pixels.length / 4)

  for (let index = 0; index < pixels.length; index += 4) {
    grayscale[index / 4] = clipByte(
      pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114,
    )
  }

  const mode = options?.mode ?? 'balanced'
  const normalized = normalizeGrayscaleValues(grayscale, mode)
  const processedValues =
    mode === 'adaptive'
      ? buildAdaptiveBinaryValues(
          normalized,
          workingCanvas.width,
          workingCanvas.height,
          Math.max(10, Math.round(Math.min(workingCanvas.width, workingCanvas.height) * 0.06)),
          12,
        )
      : normalized.map((value) => {
          if (mode === 'shadow') {
            if (value >= 214) return 255
            if (value <= 44) return 0
            return clipByte((value - 104) * 2.35 + 120)
          }

          if (value >= 188) return 255
          if (value <= 52) return 0
          return clipByte((value - 112) * 2.15 + 116)
        })

  for (let index = 0; index < pixels.length; index += 4) {
    const value = processedValues[index / 4]
    pixels[index] = value
    pixels[index + 1] = value
    pixels[index + 2] = value
    pixels[index + 3] = 255
  }

  context.putImageData(imageData, 0, 0)

  return {
    canvas: workingCanvas,
    previewUrl: workingCanvas.toDataURL('image/jpeg', 0.92),
  }
}

export function prepareOcrVariants(sourceCanvas: HTMLCanvasElement) {
  const variants = [
    prepareProcessedCrop(sourceCanvas, {
      paddingRatio: 0,
      mode: 'balanced',
    }),
    prepareProcessedCrop(sourceCanvas, {
      paddingRatio: 0.02,
      mode: 'adaptive',
    }),
    prepareProcessedCrop(sourceCanvas, {
      paddingRatio: 0.03,
      mode: 'shadow',
      perspectiveTilt: 0.13,
      rotationDeg: 2.6,
    }),
    prepareProcessedCrop(sourceCanvas, {
      paddingRatio: 0.03,
      mode: 'shadow',
      perspectiveTilt: -0.13,
      rotationDeg: -2.6,
    }),
  ]

  return {
    previewUrl: variants[0].previewUrl,
    canvases: variants.map((variant) => variant.canvas),
  }
}

export function analyzeFrameGuidance(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  previousValues: Uint8Array | null,
) {
  const rect = buildOcrCropRect(width, height, 0.02)
  const imageData = context.getImageData(rect.left, rect.top, rect.width, rect.height)
  const pixels = imageData.data
  const grayscaleValues = new Uint8Array(rect.width * rect.height)
  let brightnessSum = 0
  let contrastEnergy = 0
  let edgeSum = 0
  let highlightCount = 0
  let darkCount = 0
  let motionSum = 0

  for (let index = 0; index < pixels.length; index += 4) {
    const pixelIndex = index / 4
    const grayscale = Math.round(
      pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114,
    )

    grayscaleValues[pixelIndex] = grayscale
    brightnessSum += grayscale
    contrastEnergy += grayscale * grayscale

    if (grayscale >= 235) highlightCount += 1
    if (grayscale <= 62) darkCount += 1

    if (previousValues) {
      motionSum += Math.abs(grayscale - previousValues[pixelIndex])
    }

    const x = pixelIndex % rect.width
    const y = Math.floor(pixelIndex / rect.width)

    if (x > 0) {
      edgeSum += Math.abs(grayscale - grayscaleValues[pixelIndex - 1])
    }

    if (y > 0) {
      edgeSum += Math.abs(grayscale - grayscaleValues[pixelIndex - rect.width])
    }
  }

  const pixelCount = grayscaleValues.length
  const brightness = brightnessSum / pixelCount
  const variance = contrastEnergy / pixelCount - brightness * brightness
  const contrast = Math.sqrt(Math.max(0, variance))
  const edgeStrength = edgeSum / Math.max(1, pixelCount)
  const motion = previousValues ? motionSum / pixelCount : 0
  const highlightRatio = highlightCount / pixelCount
  const darkRatio = darkCount / pixelCount
  const metrics: LiveFrameMetrics = {
    brightness,
    contrast,
    edgeStrength,
    motion,
    highlightRatio,
    darkRatio,
  }

  const guides: CaptureGuide[] = []

  if (metrics.motion > 30) {
    guides.push({
      label: 'Ruhiger halten',
      detail: 'Kurz stillhalten, sonst wird der Tag unscharf',
      tone: 'alert',
    })
  }

  if (metrics.brightness < 88 || metrics.darkRatio > 0.36) {
    guides.push({
      label: 'Mehr Licht',
      detail: 'Tag heller drehen oder naeher an die Lichtquelle',
      tone: 'alert',
    })
  } else if (metrics.brightness > 212 || metrics.highlightRatio > 0.22) {
    guides.push({
      label: 'Blendet',
      detail: 'Winkel leicht aendern und Spiegelung vermeiden',
      tone: 'warn',
    })
  }

  if (metrics.edgeStrength < 18 || metrics.contrast < 38) {
    guides.push({
      label: 'Naeher ran',
      detail: 'Ziffern sollen im Rahmen deutlich groesser erscheinen',
      tone: 'warn',
    })
  }

  if (guides.length === 0) {
    guides.push({
      label: 'Gut im Bild',
      detail: 'Jetzt aufnehmen',
      tone: 'good',
    })
  }

  if (guides.length === 1 && guides[0].tone === 'good') {
    guides.push({
      label: 'Rahmen halten',
      detail: 'Tag moeglichst frontal und allein im Fokus lassen',
      tone: 'good',
    })
  }

  return {
    grayscaleValues,
    guides,
    isStable:
      metrics.motion <= 16 &&
      metrics.brightness >= 88 &&
      metrics.brightness <= 212 &&
      metrics.darkRatio <= 0.36 &&
      metrics.highlightRatio <= 0.22 &&
      metrics.edgeStrength >= 18 &&
      metrics.contrast >= 38,
  }
}

export function guideToneClasses(tone: GuideTone) {
  switch (tone) {
    case 'good':
      return 'border-[#9db7ab] bg-[#e6efe9] text-[#17392c]'
    case 'alert':
      return 'border-[#d29d8d] bg-[#f8e9e3] text-[#6e2918]'
    default:
      return 'border-[#ccb98a] bg-[#f3ede0] text-neutral-800'
  }
}
