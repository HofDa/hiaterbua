import type {
  CaptureGuide,
  GuideTone,
} from '@/lib/animals/ear-tag-ocr-types'
import { buildOcrCropRect } from '@/lib/animals/ear-tag-ocr-image-processing'

type LiveFrameMetrics = {
  brightness: number
  contrast: number
  edgeStrength: number
  motion: number
  highlightRatio: number
  darkRatio: number
}

export function analyzeFrameGuidance(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  previousValues: Uint8Array | null
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
      pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114
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
      detail: 'Tag heller drehen oder näher an die Lichtquelle',
      tone: 'alert',
    })
  } else if (metrics.brightness > 212 || metrics.highlightRatio > 0.22) {
    guides.push({
      label: 'Blendet',
      detail: 'Winkel leicht ändern und Spiegelung vermeiden',
      tone: 'warn',
    })
  }

  if (metrics.edgeStrength < 18 || metrics.contrast < 38) {
    guides.push({
      label: 'Näher ran',
      detail: 'Ziffern sollen im Rahmen deutlich größer erscheinen',
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
      detail: 'Tag möglichst frontal und allein im Fokus lassen',
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
