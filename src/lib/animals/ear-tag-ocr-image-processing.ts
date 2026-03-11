import {
  OCR_FRAME_HEIGHT_RATIO,
  OCR_FRAME_WIDTH_RATIO,
} from '@/lib/animals/ear-tag-ocr-types'

type CropRect = {
  left: number
  top: number
  width: number
  height: number
}

type OcrVariantMode = 'balanced' | 'adaptive' | 'shadow'

const OCR_FRAME_MIN_WIDTH = 280
const OCR_FRAME_MIN_HEIGHT = 112

function clipByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

export function buildOcrCropRect(width: number, height: number, paddingRatio = 0): CropRect {
  const targetWidthRatio = Math.min(0.82, OCR_FRAME_WIDTH_RATIO + paddingRatio)
  const targetHeightRatio = Math.min(0.34, OCR_FRAME_HEIGHT_RATIO + paddingRatio * 0.55)
  const cropWidth = Math.min(width, Math.max(OCR_FRAME_MIN_WIDTH, Math.round(width * targetWidthRatio)))
  const cropHeight = Math.min(
    height,
    Math.max(OCR_FRAME_MIN_HEIGHT, Math.round(height * targetHeightRatio))
  )

  return {
    left: Math.max(0, Math.round((width - cropWidth) / 2)),
    top: Math.max(0, Math.round((height - cropHeight) / 2)),
    width: cropWidth,
    height: cropHeight,
  }
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
  bias: number
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
      Math.min(sourceCanvas.width * 1.26, sourceCanvas.width * distortion)
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
      1
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
  }
) {
  const rect = buildOcrCropRect(
    sourceCanvas.width,
    sourceCanvas.height,
    options?.paddingRatio ?? 0
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
    cropCanvas.height
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
  }
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
      pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114
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
          12
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
