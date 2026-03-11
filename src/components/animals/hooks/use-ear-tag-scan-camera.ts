import type { Dispatch, SetStateAction } from 'react'
import type { CaptureGuide } from '@/lib/animals/ear-tag-ocr'
import { getEarTagScanCameraCopy } from '@/components/animals/ear-tag-scan-camera-copy'
import { useEarTagScanCameraRuntime } from '@/components/animals/hooks/use-ear-tag-scan-camera-runtime'
import type { OcrStatus } from '@/components/animals/ear-tag-scan-types'

type UseEarTagScanCameraOptions = {
  disabled: boolean
  supportsCamera: boolean
  value: string
  ocrStatus: OcrStatus
  ocrProgress: number
  setScanDraft: Dispatch<SetStateAction<string | null>>
  setCaptureGuides: Dispatch<SetStateAction<CaptureGuide[]>>
  resetOcrState: (options?: { preserveDraft?: boolean }) => void
  readEarTagFromCapture: (sourceCanvas: HTMLCanvasElement) => Promise<void>
}

export function useEarTagScanCamera({
  disabled,
  supportsCamera,
  value,
  ocrStatus,
  ocrProgress,
  setScanDraft,
  setCaptureGuides,
  resetOcrState,
  readEarTagFromCapture,
}: UseEarTagScanCameraOptions) {
  const runtime = useEarTagScanCameraRuntime({
    disabled,
    supportsCamera,
    value,
    setScanDraft,
    setCaptureGuides,
    resetOcrState,
    readEarTagFromCapture,
  })

  const copy = getEarTagScanCameraCopy({
    isCapturingPhoto: runtime.isCapturingPhoto,
    cameraStep: runtime.cameraStep,
    cameraStatus: runtime.cameraStatus,
    captureStabilityMs: runtime.captureStabilityMs,
    ocrStatus,
    ocrProgress,
  })

  return {
    ...runtime,
    ...copy,
  }
}
