import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { type CaptureGuide } from '@/lib/animals/ear-tag-ocr'
import { useEarTagScanCameraCapture } from '@/components/animals/hooks/use-ear-tag-scan-camera-capture'
import { useEarTagScanCameraLifecycle } from '@/components/animals/hooks/use-ear-tag-scan-camera-lifecycle'
import type {
  CameraStatus,
  CameraStep,
  ScanMode,
} from '@/components/animals/ear-tag-scan-types'

type UseEarTagScanCameraStreamOptions = {
  disabled: boolean
  supportsCamera: boolean
  value: string
  videoRef: MutableRefObject<HTMLVideoElement | null>
  canvasRef: MutableRefObject<HTMLCanvasElement | null>
  streamRef: MutableRefObject<MediaStream | null>
  guideLoopTimeoutRef: MutableRefObject<number | null>
  previousGuideFrameRef: MutableRefObject<Uint8Array | null>
  stableSinceRef: MutableRefObject<number | null>
  captureInFlightRef: MutableRefObject<boolean>
  autoCaptureRequestedRef: MutableRefObject<boolean>
  requestIdRef: MutableRefObject<number>
  isMountedRef: MutableRefObject<boolean>
  cameraStep: CameraStep
  cameraStatus: CameraStatus
  setMode: Dispatch<SetStateAction<ScanMode>>
  setCameraStep: Dispatch<SetStateAction<CameraStep>>
  setCameraStatus: Dispatch<SetStateAction<CameraStatus>>
  setCameraError: Dispatch<SetStateAction<string>>
  setCapturedImageUrl: Dispatch<SetStateAction<string | null>>
  setCaptureStabilityMs: Dispatch<SetStateAction<number | null>>
  setIsCapturingPhoto: Dispatch<SetStateAction<boolean>>
  setScanDraft: Dispatch<SetStateAction<string | null>>
  setCaptureGuides: Dispatch<SetStateAction<CaptureGuide[]>>
  resetOcrState: (options?: { preserveDraft?: boolean }) => void
  readEarTagFromCapture: (sourceCanvas: HTMLCanvasElement) => Promise<void>
}

export function useEarTagScanCameraStream({
  disabled,
  supportsCamera,
  value,
  videoRef,
  canvasRef,
  streamRef,
  guideLoopTimeoutRef,
  previousGuideFrameRef,
  stableSinceRef,
  captureInFlightRef,
  autoCaptureRequestedRef,
  requestIdRef,
  isMountedRef,
  cameraStep,
  cameraStatus,
  setMode,
  setCameraStep,
  setCameraStatus,
  setCameraError,
  setCapturedImageUrl,
  setCaptureStabilityMs,
  setIsCapturingPhoto,
  setScanDraft,
  setCaptureGuides,
  resetOcrState,
  readEarTagFromCapture,
}: UseEarTagScanCameraStreamOptions) {
  const { stopActiveCamera, switchMode, startCameraFraming } =
    useEarTagScanCameraLifecycle({
      disabled,
      supportsCamera,
      videoRef,
      streamRef,
      guideLoopTimeoutRef,
      previousGuideFrameRef,
      stableSinceRef,
      captureInFlightRef,
      autoCaptureRequestedRef,
      requestIdRef,
      isMountedRef,
      cameraStep,
      cameraStatus,
      setMode,
      setCameraStep,
      setCameraStatus,
      setCameraError,
      setCapturedImageUrl,
      setCaptureStabilityMs,
      setCaptureGuides,
      resetOcrState,
    })

  const { capturePreview, resetCapture } = useEarTagScanCameraCapture({
    value,
    videoRef,
    canvasRef,
    streamRef,
    captureInFlightRef,
    autoCaptureRequestedRef,
    requestIdRef,
    isMountedRef,
    cameraStep,
    setCameraStep,
    setCameraError,
    setCapturedImageUrl,
    setIsCapturingPhoto,
    setScanDraft,
    setCaptureGuides,
    setCaptureStabilityMs,
    stopActiveCamera,
    resetOcrState,
    readEarTagFromCapture,
  })

  return {
    switchMode,
    startCameraFraming,
    capturePreview,
    resetCapture,
  }
}
