'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

type EarTagScanPanelProps = {
  disabled?: boolean
  value: string
  onApplyValue: (value: string) => void
}

type ScanMode = 'manual' | 'camera'
type CameraStep = 'ready' | 'framing' | 'captured'
type CameraStatus = 'idle' | 'starting' | 'live'
type OcrStatus = 'idle' | 'preparing' | 'reading' | 'ready' | 'error'
type GuideTone = 'good' | 'warn' | 'alert'
type TesseractModule = typeof import('tesseract.js')
type OcrWorker = Awaited<ReturnType<TesseractModule['createWorker']>>
type OcrPassResult = {
  text: string
  confidence: number
}
type CaptureGuide = {
  label: string
  detail: string
  tone: GuideTone
}
type EarTagSuggestion = {
  value: string
  score: number
  confidence: number
  substitutions: number
}
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

const ocrInitialMessage = 'Foto aufnehmen, dann wird die Ohrmarke automatisch gelesen.'
const OCR_FRAME_WIDTH_RATIO = 0.58
const OCR_FRAME_HEIGHT_RATIO = 0.22
const OCR_FRAME_MIN_WIDTH = 280
const OCR_FRAME_MIN_HEIGHT = 112
const LOCAL_PREFIX_BONUS = new Set(['IT', 'AT', 'DE', 'CH', 'SI'])
const defaultCaptureGuides: CaptureGuide[] = [
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

function stopMediaStream(stream: MediaStream | null) {
  if (!stream) return

  stream.getTracks().forEach((track) => {
    track.stop()
  })
}

function describeCameraError(error: unknown) {
  if (!(error instanceof DOMException)) {
    return 'Kamera konnte nicht gestartet werden.'
  }

  if (error.name === 'NotAllowedError') {
    return 'Kamerazugriff wurde blockiert. Bitte Berechtigung freigeben.'
  }

  if (error.name === 'NotFoundError') {
    return 'Keine Kamera gefunden.'
  }

  if (error.name === 'NotReadableError') {
    return 'Kamera ist bereits in Verwendung oder nicht lesbar.'
  }

  if (error.name === 'OverconstrainedError') {
    return 'Gewuenschte Kameraeinstellung ist auf diesem Geraet nicht verfuegbar.'
  }

  return 'Kamera konnte nicht gestartet werden.'
}

function describeOcrStatus(status: string) {
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

function describeOcrError(error: unknown) {
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

function normalizeEarTagText(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9/-]+/g, '')
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

function describeRecognitionMessage(suggestion: EarTagSuggestion) {
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

function buildRankedEarTagSuggestions(results: OcrPassResult[]) {
  const ranked = new Map<string, EarTagSuggestion>()

  for (const result of results) {
    for (const seed of extractSuggestionSeeds(result.text)) {
      for (const baseVariant of buildEarTagVariants(seed)) {
        for (const suggestion of buildSuggestionVariants(baseVariant)) {
          const nextScore =
            scoreRecognitionCandidate(suggestion.value, result.confidence) -
            suggestion.substitutions * 1.75

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

function prepareProcessedCrop(
  sourceCanvas: HTMLCanvasElement,
  options?: { paddingRatio?: number; mode?: 'balanced' | 'binary' },
) {
  const rect = buildOcrCropRect(
    sourceCanvas.width,
    sourceCanvas.height,
    options?.paddingRatio ?? 0,
  )
  const scale = options?.mode === 'binary' ? 2.6 : 2.2
  const preparedCanvas = document.createElement('canvas')
  const context = preparedCanvas.getContext('2d')

  if (!context) {
    throw new Error('OCR canvas unavailable')
  }

  preparedCanvas.width = Math.round(rect.width * scale)
  preparedCanvas.height = Math.round(rect.height * scale)

  context.drawImage(
    sourceCanvas,
    rect.left,
    rect.top,
    rect.width,
    rect.height,
    0,
    0,
    preparedCanvas.width,
    preparedCanvas.height,
  )

  const imageData = context.getImageData(0, 0, preparedCanvas.width, preparedCanvas.height)
  const pixels = imageData.data
  let totalBrightness = 0

  for (let index = 0; index < pixels.length; index += 4) {
    const grayscale = pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114
    totalBrightness += grayscale
    pixels[index] = grayscale
    pixels[index + 1] = grayscale
    pixels[index + 2] = grayscale
  }

  const averageBrightness = totalBrightness / (pixels.length / 4)
  const binaryThreshold = averageBrightness > 165 ? 185 : averageBrightness < 110 ? 118 : 145

  for (let index = 0; index < pixels.length; index += 4) {
    const grayscale = pixels[index]
    const contrasted =
      options?.mode === 'binary'
        ? grayscale > binaryThreshold
          ? 255
          : 0
        : grayscale > 160
          ? 255
          : grayscale < 72
            ? 0
            : Math.max(0, Math.min(255, (grayscale - 126) * 2.3 + 126))

    pixels[index] = contrasted
    pixels[index + 1] = contrasted
    pixels[index + 2] = contrasted
  }

  context.putImageData(imageData, 0, 0)

  return {
    canvas: preparedCanvas,
    previewUrl: preparedCanvas.toDataURL('image/jpeg', 0.92),
  }
}

function prepareOcrVariants(sourceCanvas: HTMLCanvasElement) {
  const primary = prepareProcessedCrop(sourceCanvas, {
    paddingRatio: 0,
    mode: 'balanced',
  })
  const fallback = prepareProcessedCrop(sourceCanvas, {
    paddingRatio: 0.08,
    mode: 'binary',
  })

  return {
    previewUrl: primary.previewUrl,
    canvases: [primary.canvas, fallback.canvas],
  }
}

function analyzeFrameGuidance(
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
  }
}

function guideToneClasses(tone: GuideTone) {
  switch (tone) {
    case 'good':
      return 'border-[#9db7ab] bg-[#e6efe9] text-[#17392c]'
    case 'alert':
      return 'border-[#d29d8d] bg-[#f8e9e3] text-[#6e2918]'
    default:
      return 'border-[#ccb98a] bg-[#f3ede0] text-neutral-800'
  }
}

export function EarTagScanPanel({
  disabled = false,
  value,
  onApplyValue,
}: EarTagScanPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const guideLoopTimeoutRef = useRef<number | null>(null)
  const previousGuideFrameRef = useRef<Uint8Array | null>(null)
  const requestIdRef = useRef(0)
  const isMountedRef = useRef(true)
  const ocrWorkerRef = useRef<OcrWorker | null>(null)
  const ocrWorkerPromiseRef = useRef<Promise<OcrWorker> | null>(null)
  const ocrRequestIdRef = useRef(0)
  const ocrActiveRequestIdRef = useRef(0)
  const [mode, setMode] = useState<ScanMode>('manual')
  const [cameraStep, setCameraStep] = useState<CameraStep>('ready')
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle')
  const [cameraError, setCameraError] = useState('')
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null)
  const [scanDraft, setScanDraft] = useState<string | null>(null)
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrMessage, setOcrMessage] = useState(ocrInitialMessage)
  const [ocrError, setOcrError] = useState('')
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState<string | null>(null)
  const [ocrSuggestions, setOcrSuggestions] = useState<EarTagSuggestion[]>([])
  const [captureGuides, setCaptureGuides] = useState<CaptureGuide[]>(defaultCaptureGuides)

  const supportsCamera =
    typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
  const effectiveDraft = scanDraft ?? value
  const cleanedDraft = effectiveDraft.trim()
  const isReadingOcr = ocrStatus === 'preparing' || ocrStatus === 'reading'
  const cameraGuideTitle =
    cameraStep === 'ready'
      ? 'Kamera bereit'
      : cameraStep === 'framing'
        ? cameraStatus === 'starting'
          ? 'Kamera startet'
          : 'Scan-Fokus'
        : 'Ergebnis pruefen'
  const cameraGuideDetail =
    cameraStep === 'ready'
      ? 'Rueckkamera wird genutzt, wenn das Geraet sie anbietet.'
      : cameraStep === 'framing'
        ? cameraStatus === 'starting'
          ? 'Bitte kurz warten, bis das Kamerabild erscheint.'
          : 'Ohrmarke moeglichst frontal und allein in den Rahmen nehmen.'
        : isReadingOcr
          ? 'OCR liest jetzt den markierten Mittelbereich.'
          : 'Foto ansehen und Ergebnis darunter pruefen.'
  const cameraStateLabel =
    cameraStep === 'captured'
      ? ocrStatus === 'reading'
        ? `OCR ${Math.round(ocrProgress * 100)}%`
        : ocrStatus === 'preparing'
          ? 'OCR startet'
          : ocrStatus === 'ready'
            ? 'OCR bereit'
            : ocrStatus === 'error'
              ? 'OCR pruefen'
              : 'Foto bereit'
      : cameraStatus === 'live'
        ? 'Kamera live'
        : cameraStatus === 'starting'
          ? 'Kamera startet'
          : 'Kamera aus'

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      requestIdRef.current += 1
      ocrRequestIdRef.current += 1
      ocrActiveRequestIdRef.current = ocrRequestIdRef.current
      if (guideLoopTimeoutRef.current) {
        window.clearTimeout(guideLoopTimeoutRef.current)
        guideLoopTimeoutRef.current = null
      }
      previousGuideFrameRef.current = null
      stopMediaStream(streamRef.current)
      streamRef.current = null

      const worker = ocrWorkerRef.current
      ocrWorkerRef.current = null
      ocrWorkerPromiseRef.current = null

      if (worker) {
        void worker.terminate().catch(() => {})
      }
    }
  }, [])

  useEffect(() => {
    const videoElement = videoRef.current

    if (!videoElement || cameraStep !== 'framing' || !streamRef.current) {
      return
    }

    videoElement.srcObject = streamRef.current
    videoElement.muted = true
    videoElement.playsInline = true

    void videoElement.play().catch(() => {})

    return () => {
      if (videoElement.srcObject) {
        videoElement.srcObject = null
      }
    }
  }, [cameraStep, cameraStatus])

  useEffect(() => {
    if (cameraStep !== 'framing' || cameraStatus !== 'live') {
      if (guideLoopTimeoutRef.current) {
        window.clearTimeout(guideLoopTimeoutRef.current)
        guideLoopTimeoutRef.current = null
      }

      previousGuideFrameRef.current = null

      if (cameraStep === 'ready') {
        setCaptureGuides(defaultCaptureGuides)
      }

      return
    }

    const videoElement = videoRef.current

    if (!videoElement) {
      setCaptureGuides(defaultCaptureGuides)
      return
    }

    const analysisCanvas =
      analysisCanvasRef.current ?? document.createElement('canvas')
    analysisCanvasRef.current = analysisCanvas
    analysisCanvas.width = 160
    analysisCanvas.height = 120
    const context = analysisCanvas.getContext('2d', { willReadFrequently: true })

    if (!context) {
      return
    }

    let cancelled = false

    const runGuideLoop = () => {
      if (cancelled) {
        return
      }

      if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
        context.drawImage(videoElement, 0, 0, analysisCanvas.width, analysisCanvas.height)
        const nextAnalysis = analyzeFrameGuidance(
          context,
          analysisCanvas.width,
          analysisCanvas.height,
          previousGuideFrameRef.current,
        )

        previousGuideFrameRef.current = nextAnalysis.grayscaleValues
        setCaptureGuides(nextAnalysis.guides)
      }

      guideLoopTimeoutRef.current = window.setTimeout(runGuideLoop, 420)
    }

    runGuideLoop()

    return () => {
      cancelled = true
      previousGuideFrameRef.current = null

      if (guideLoopTimeoutRef.current) {
        window.clearTimeout(guideLoopTimeoutRef.current)
        guideLoopTimeoutRef.current = null
      }
    }
  }, [cameraStep, cameraStatus])

  function stopActiveCamera() {
    requestIdRef.current += 1
    stopMediaStream(streamRef.current)
    streamRef.current = null
    setCameraStatus('idle')
  }

  function resetOcrState(options?: { preserveDraft?: boolean }) {
    ocrRequestIdRef.current += 1
    ocrActiveRequestIdRef.current = ocrRequestIdRef.current
    setOcrStatus('idle')
    setOcrProgress(0)
    setOcrMessage(ocrInitialMessage)
    setOcrError('')
    setOcrPreviewUrl(null)
    setOcrSuggestions([])

    if (!options?.preserveDraft) {
      setScanDraft(null)
    }
  }

  async function getOcrWorker() {
    if (ocrWorkerRef.current) {
      return ocrWorkerRef.current
    }

    if (ocrWorkerPromiseRef.current) {
      return ocrWorkerPromiseRef.current
    }

    const promise = (async () => {
      const tesseract = await import('tesseract.js')
      const worker = await tesseract.createWorker('eng', 1, {
        logger: (message) => {
          if (!isMountedRef.current || !ocrActiveRequestIdRef.current) {
            return
          }

          setOcrStatus(message.status === 'recognizing text' ? 'reading' : 'preparing')
          setOcrProgress(message.progress)
          setOcrMessage(describeOcrStatus(message.status))
        },
      })

      await worker.setParameters({
        tessedit_pageseg_mode: tesseract.PSM.SINGLE_LINE,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/-',
        preserve_interword_spaces: '0',
        user_defined_dpi: '300',
      })

      ocrWorkerRef.current = worker
      return worker
    })()

    ocrWorkerPromiseRef.current = promise

    try {
      return await promise
    } catch (error) {
      ocrWorkerRef.current = null
      ocrWorkerPromiseRef.current = null
      throw error
    }
  }

  async function readEarTagFromCapture(sourceCanvas: HTMLCanvasElement) {
    const nextRequestId = ocrRequestIdRef.current + 1
    ocrRequestIdRef.current = nextRequestId
    ocrActiveRequestIdRef.current = nextRequestId
    setOcrStatus('preparing')
    setOcrProgress(0.02)
    setOcrMessage('Foto wird fuer OCR vorbereitet')
    setOcrError('')

    try {
      const { canvases, previewUrl } = prepareOcrVariants(sourceCanvas)

      if (ocrRequestIdRef.current !== nextRequestId || !isMountedRef.current) {
        return
      }

      setOcrPreviewUrl(previewUrl)

      const worker = await getOcrWorker()

      if (ocrRequestIdRef.current !== nextRequestId || !isMountedRef.current) {
        return
      }

      const recognitionResults: OcrPassResult[] = []

      for (const [variantIndex, canvas] of canvases.entries()) {
        const result = await worker.recognize(canvas)

        if (ocrRequestIdRef.current !== nextRequestId || !isMountedRef.current) {
          return
        }

        recognitionResults.push({
          text: result.data.text,
          confidence: result.data.confidence,
        })

        const passSuggestions = buildRankedEarTagSuggestions([
          {
            text: result.data.text,
            confidence: result.data.confidence,
          },
        ])
        const bestPassSuggestion = passSuggestions[0]

        if (
          bestPassSuggestion &&
          (bestPassSuggestion.score >= 24 ||
            (variantIndex === 0 && bestPassSuggestion.confidence >= 74))
        ) {
          break
        }
      }

      const suggestions = buildRankedEarTagSuggestions(recognitionResults)
      const bestSuggestion = suggestions[0]

      if (!bestSuggestion) {
        setOcrStatus('error')
        setOcrProgress(0)
        setOcrMessage('Keine klare Ohrmarke erkannt')
        setOcrError('Bitte Ergebnis manuell eingeben oder Foto neu aufnehmen.')
        setOcrSuggestions([])
        setCaptureGuides([
          {
            label: 'Kein klares Ergebnis',
            detail: 'Tag groesser, heller oder ruhiger aufnehmen',
            tone: 'alert',
          },
          {
            label: 'Manuell bleibt moeglich',
            detail: 'Nummer unten direkt korrigieren oder eintippen',
            tone: 'warn',
          },
        ])
        return
      }

      setScanDraft(bestSuggestion.value)
      setOcrSuggestions(suggestions)
      setOcrStatus('ready')
      setOcrProgress(1)
      setOcrMessage(describeRecognitionMessage(bestSuggestion))
      setOcrError('')
      setCaptureGuides([
        {
          label: bestSuggestion.confidence >= 70 ? 'OCR klar' : 'OCR unsicher',
          detail:
            bestSuggestion.confidence >= 70
              ? 'Ergebnis unten kurz bestaetigen'
              : suggestions.length > 1
                ? 'Alternativen unten vergleichen'
                : 'Ergebnis unten genau pruefen',
          tone: bestSuggestion.confidence >= 70 ? 'good' : 'warn',
        },
        {
          label: `Erkannt: ${bestSuggestion.value}`,
          detail:
            suggestions.length > 1
              ? `${suggestions.length} Vorschlaege verfuegbar`
              : 'Bei Bedarf manuell korrigieren',
          tone: 'good',
        },
      ])
    } catch (error) {
      if (ocrRequestIdRef.current !== nextRequestId || !isMountedRef.current) {
        return
      }

      setOcrStatus('error')
      setOcrProgress(0)
      setOcrMessage('OCR konnte nicht abgeschlossen werden')
      setOcrError(describeOcrError(error))
      setOcrSuggestions([])
      setCaptureGuides([
        {
          label: 'OCR fehlgeschlagen',
          detail: 'Neu aufnehmen oder Nummer manuell eingeben',
          tone: 'alert',
        },
      ])
    }
  }

  function switchMode(nextMode: ScanMode) {
    setMode(nextMode)
    setCameraError('')

    if (nextMode === 'manual') {
      stopActiveCamera()
      setCameraStep('ready')
      setCapturedImageUrl(null)
      setCaptureGuides(defaultCaptureGuides)
      resetOcrState()
    } else {
      setCapturedImageUrl(null)
      setCaptureGuides(defaultCaptureGuides)
      resetOcrState({ preserveDraft: true })
    }
  }

  async function startCameraFraming() {
    if (disabled || cameraStatus === 'starting') {
      return
    }

    setMode('camera')
    setCameraError('')
    setCapturedImageUrl(null)
    resetOcrState({ preserveDraft: true })

    if (!supportsCamera) {
      setCameraStep('ready')
      setCameraStatus('idle')
      setCameraError('Dieses Geraet oder dieser Browser bietet keine Web-Kamera an.')
      return
    }

    const nextRequestId = requestIdRef.current + 1
    requestIdRef.current = nextRequestId
    stopMediaStream(streamRef.current)
    streamRef.current = null
    setCameraStep('framing')
    setCameraStatus('starting')

    try {
      let stream: MediaStream

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        })
      }

      if (requestIdRef.current !== nextRequestId) {
        stopMediaStream(stream)
        return
      }

      streamRef.current = stream
      setCameraStatus('live')
    } catch (error) {
      if (requestIdRef.current !== nextRequestId) {
        return
      }

      setCameraStep('ready')
      setCameraStatus('idle')
      setCameraError(describeCameraError(error))
    }
  }

  function capturePreview() {
    const videoElement = videoRef.current
    const canvasElement = canvasRef.current

    if (!videoElement || !canvasElement) {
      setCameraError('Kamera ist noch nicht bereit.')
      return
    }

    if (videoElement.videoWidth <= 0 || videoElement.videoHeight <= 0) {
      setCameraError('Kamera ist noch nicht bereit.')
      return
    }

    const context = canvasElement.getContext('2d')
    if (!context) {
      setCameraError('Foto konnte nicht vorbereitet werden.')
      return
    }

    canvasElement.width = videoElement.videoWidth
    canvasElement.height = videoElement.videoHeight
    context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height)

    setCapturedImageUrl(canvasElement.toDataURL('image/jpeg', 0.92))
    stopActiveCamera()
    setCameraStep('captured')
    setCameraError('')
    setCaptureGuides([
      {
        label: 'Foto aufgenommen',
        detail: 'OCR prueft jetzt den mittleren Fokusbereich',
        tone: 'good',
      },
    ])
    setScanDraft((currentDraft) => {
      if (currentDraft?.trim()) {
        return currentDraft
      }

      return value.trim() || null
    })

    void readEarTagFromCapture(canvasElement)
  }

  function resetCapture() {
    stopActiveCamera()
    setCameraStep('ready')
    setCapturedImageUrl(null)
    setCameraError('')
    setCaptureGuides(defaultCaptureGuides)
    resetOcrState()
  }

  function applyDraft() {
    if (!cleanedDraft) return
    onApplyValue(cleanedDraft)
  }

  return (
    <div className="rounded-[1.4rem] border border-[#ccb98a] bg-[#f6efdf] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-700">
            Ohrmarke erfassen
          </h3>
          <p className="mt-1 text-sm text-neutral-700">
            Manuell eingeben oder direkt ueber die Kamera fotografieren und vorpruefen.
          </p>
        </div>
        <div className="rounded-full border border-[#ccb98a] bg-[#fffdf6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-neutral-700">
          {cameraStateLabel}
        </div>
      </div>

      <div className="mt-4 inline-flex rounded-full border border-[#ccb98a] bg-[#fffdf6] p-1 shadow-sm">
        <button
          type="button"
          onClick={() => switchMode('manual')}
          disabled={isReadingOcr}
          className={[
            'rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50',
            mode === 'manual'
              ? 'border border-[#5a5347] bg-[#f1efeb] text-neutral-950'
              : 'border border-transparent bg-transparent text-neutral-700',
          ].join(' ')}
        >
          Manuell
        </button>
        <button
          type="button"
          onClick={() => switchMode('camera')}
          disabled={isReadingOcr}
          className={[
            'rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50',
            mode === 'camera'
              ? 'border border-[#5a5347] bg-[#f1efeb] text-neutral-950'
              : 'border border-transparent bg-transparent text-neutral-700',
          ].join(' ')}
        >
          Scan-Ansicht
        </button>
      </div>

      {mode === 'manual' ? (
        <div className="mt-4 rounded-[1.2rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-4 text-sm text-neutral-700 shadow-sm">
          Ohrmarke direkt eintippen. Die Scan-Ansicht nutzt Kamera plus OCR und
          uebernimmt den erkannten Wert erst nach deiner Kontrolle.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-[1.3rem] border border-[#ccb98a] bg-[#fffdf6] p-4 shadow-sm">
            <div className="rounded-[1rem] border border-[#d8ccb2] bg-[#f7f2e7] px-4 py-3 shadow-sm">
              <div className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-700">
                {cameraGuideTitle}
              </div>
              <div className="mt-1 text-sm font-medium text-neutral-900">
                {cameraGuideDetail}
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[1.5rem] border-2 border-[#3a342a] bg-[linear-gradient(180deg,#d4ccb9,#bdb39f)] p-3 sm:p-4">
              <div className="relative flex aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/3] items-center justify-center overflow-hidden rounded-[1.2rem] border border-[#b6a889] bg-[radial-gradient(circle_at_top,#f5f1e7_0%,#d1c6b0_58%,#b5a78d_100%)]">
                {cameraStep === 'framing' ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                {cameraStep === 'captured' && capturedImageUrl ? (
                  <Image
                    src={capturedImageUrl}
                    alt="Aufgenommene Ohrmarke"
                    fill
                    unoptimized
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,253,246,0.12),rgba(42,34,25,0.12))]" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
                  <div
                    className="relative rounded-[1.2rem] border-[3px] border-[rgba(255,253,246,0.96)] shadow-[0_0_0_1px_rgba(23,57,44,0.55),0_18px_36px_rgba(23,57,44,0.18)]"
                    style={{
                      width: `${OCR_FRAME_WIDTH_RATIO * 100}%`,
                      height: `${OCR_FRAME_HEIGHT_RATIO * 100}%`,
                    }}
                  >
                    <div className="absolute -left-[3px] -top-[3px] h-5 w-5 rounded-tl-[0.9rem] border-l-[4px] border-t-[4px] border-[#17392c]" />
                    <div className="absolute -right-[3px] -top-[3px] h-5 w-5 rounded-tr-[0.9rem] border-r-[4px] border-t-[4px] border-[#17392c]" />
                    <div className="absolute -bottom-[3px] -left-[3px] h-5 w-5 rounded-bl-[0.9rem] border-b-[4px] border-l-[4px] border-[#17392c]" />
                    <div className="absolute -bottom-[3px] -right-[3px] h-5 w-5 rounded-br-[0.9rem] border-b-[4px] border-r-[4px] border-[#17392c]" />
                    <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[rgba(255,253,246,0.55)]" />
                    <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-[rgba(255,253,246,0.4)]" />
                  </div>
                </div>
              </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {(cameraStep === 'framing' || cameraStep === 'captured') && captureGuides.length ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {captureGuides.map((guide) => (
                  <div
                    key={`${guide.label}-${guide.detail}`}
                    className={`rounded-[1rem] border px-3 py-3 shadow-sm ${guideToneClasses(guide.tone)}`}
                  >
                    <div className="text-[0.72rem] font-semibold uppercase tracking-[0.14em]">
                      {guide.label}
                    </div>
                    <div className="mt-1 text-sm">{guide.detail}</div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {cameraStep === 'ready' ? (
                <button
                  type="button"
                  onClick={() => void startCameraFraming()}
                  disabled={disabled || !supportsCamera}
                  className="rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-3 text-sm font-semibold text-neutral-950 shadow-sm disabled:opacity-50"
                >
                  {supportsCamera ? 'Kamera vorbereiten' : 'Kamera nicht verfuegbar'}
                </button>
              ) : null}

              {cameraStep === 'framing' ? (
                <>
                  <button
                    type="button"
                    onClick={capturePreview}
                    disabled={disabled || cameraStatus !== 'live'}
                    className="rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-3 text-sm font-semibold text-neutral-950 shadow-sm disabled:opacity-50"
                  >
                    {cameraStatus === 'starting' ? 'Kamera startet ...' : 'Foto aufnehmen'}
                  </button>
                  <button
                    type="button"
                    onClick={resetCapture}
                    className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-neutral-950 shadow-sm"
                  >
                    Abbrechen
                  </button>
                </>
              ) : null}

              {cameraStep === 'captured' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const canvasElement = canvasRef.current

                      if (!canvasElement) {
                        setOcrStatus('error')
                        setOcrError('Foto steht nicht mehr fuer OCR bereit.')
                        return
                      }

                      void readEarTagFromCapture(canvasElement)
                    }}
                    disabled={disabled || isReadingOcr}
                    className="rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-3 text-sm font-semibold text-neutral-950 shadow-sm disabled:opacity-50"
                  >
                    {isReadingOcr ? 'OCR liest ...' : 'Erneut lesen'}
                  </button>
                  <button
                    type="button"
                    onClick={startCameraFraming}
                    disabled={isReadingOcr}
                    className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-neutral-950 shadow-sm disabled:opacity-50"
                  >
                    Neu aufnehmen
                  </button>
                  <button
                    type="button"
                    onClick={resetCapture}
                    disabled={isReadingOcr}
                    className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-neutral-950 shadow-sm disabled:opacity-50"
                  >
                    Verwerfen
                  </button>
                </>
              ) : null}
            </div>

            {cameraError ? (
              <div className="mt-4 rounded-[1.1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                {cameraError}
              </div>
            ) : null}
          </div>

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

            <label className="mb-1 block text-sm font-medium text-neutral-900">
              Scan-Ergebnis
            </label>
            <input
              className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
              value={effectiveDraft}
              onChange={(event) => setScanDraft(event.target.value)}
              placeholder="erkannte oder manuell korrigierte Ohrmarke"
              disabled={disabled || isReadingOcr}
            />
            <div className="mt-2 text-sm text-neutral-700">{ocrMessage}</div>

            {ocrSuggestions.length ? (
              <div className="mt-4">
                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-neutral-700">
                  OCR-Vorschlaege
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ocrSuggestions.map((suggestion, index) => {
                    const isActive = effectiveDraft === suggestion.value

                    return (
                      <button
                        key={suggestion.value}
                        type="button"
                        onClick={() => setScanDraft(suggestion.value)}
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
                          {index === 0
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
                Erstes OCR kann etwas laenger dauern, weil Sprachdaten einmalig geladen und lokal gecacht werden.
              </div>
            ) : null}

            <button
              type="button"
              onClick={applyDraft}
              disabled={disabled || !cleanedDraft}
              className="mt-3 rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-3 text-sm font-semibold text-neutral-950 shadow-sm disabled:opacity-50"
            >
              In Ohrmarke uebernehmen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
