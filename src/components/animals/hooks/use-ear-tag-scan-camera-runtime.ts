import { useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { CaptureGuide } from '@/lib/animals/ear-tag-ocr'
import { useEarTagScanCameraGuideLoop } from '@/components/animals/hooks/use-ear-tag-scan-camera-guide-loop'
import { useEarTagScanCameraStream } from '@/components/animals/hooks/use-ear-tag-scan-camera-stream'
import type {
  CameraStatus,
  CameraStep,
  ScanMode,
} from '@/components/animals/ear-tag-scan-types'

type UseEarTagScanCameraRuntimeOptions = {
  disabled: boolean
  supportsCamera: boolean
  value: string
  setScanDraft: Dispatch<SetStateAction<string | null>>
  setCaptureGuides: Dispatch<SetStateAction<CaptureGuide[]>>
  resetOcrState: (options?: { preserveDraft?: boolean }) => void
  readEarTagFromCapture: (sourceCanvas: HTMLCanvasElement) => Promise<void>
}

export function useEarTagScanCameraRuntime({
  disabled,
  supportsCamera,
  value,
  setScanDraft,
  setCaptureGuides,
  resetOcrState,
  readEarTagFromCapture,
}: UseEarTagScanCameraRuntimeOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const guideLoopTimeoutRef = useRef<number | null>(null)
  const previousGuideFrameRef = useRef<Uint8Array | null>(null)
  const stableSinceRef = useRef<number | null>(null)
  const captureInFlightRef = useRef(false)
  const autoCaptureRequestedRef = useRef(false)
  const requestIdRef = useRef(0)
  const isMountedRef = useRef(true)
  const [mode, setMode] = useState<ScanMode>('manual')
  const [cameraStep, setCameraStep] = useState<CameraStep>('ready')
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle')
  const [cameraError, setCameraError] = useState('')
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null)
  const [captureStabilityMs, setCaptureStabilityMs] = useState<number | null>(null)
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false)

  const {
    switchMode,
    startCameraFraming,
    capturePreview,
    resetCapture,
  } = useEarTagScanCameraStream({
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
  })

  useEarTagScanCameraGuideLoop({
    videoRef,
    analysisCanvasRef,
    guideLoopTimeoutRef,
    previousGuideFrameRef,
    stableSinceRef,
    captureInFlightRef,
    autoCaptureRequestedRef,
    cameraStep,
    cameraStatus,
    setCaptureGuides,
    setCaptureStabilityMs,
    capturePreview,
  })

  return {
    videoRef,
    canvasRef,
    mode,
    cameraStep,
    cameraStatus,
    cameraError,
    capturedImageUrl,
    captureStabilityMs,
    isCapturingPhoto,
    switchMode,
    startCameraFraming,
    capturePreview,
    resetCapture,
  }
}
