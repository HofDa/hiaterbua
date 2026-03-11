import { useEffect } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { AUTO_CAPTURE_STABLE_MS } from '@/lib/animals/ear-tag-camera'
import {
  analyzeFrameGuidance,
  defaultCaptureGuides,
  type CaptureGuide,
} from '@/lib/animals/ear-tag-ocr'
import type {
  CameraStatus,
  CameraStep,
} from '@/components/animals/ear-tag-scan-types'

type UseEarTagScanCameraGuideLoopOptions = {
  videoRef: MutableRefObject<HTMLVideoElement | null>
  analysisCanvasRef: MutableRefObject<HTMLCanvasElement | null>
  guideLoopTimeoutRef: MutableRefObject<number | null>
  previousGuideFrameRef: MutableRefObject<Uint8Array | null>
  stableSinceRef: MutableRefObject<number | null>
  captureInFlightRef: MutableRefObject<boolean>
  autoCaptureRequestedRef: MutableRefObject<boolean>
  cameraStep: CameraStep
  cameraStatus: CameraStatus
  setCaptureGuides: Dispatch<SetStateAction<CaptureGuide[]>>
  setCaptureStabilityMs: Dispatch<SetStateAction<number | null>>
  capturePreview: (options?: {
    preferHighResolution?: boolean
    autoTriggered?: boolean
  }) => Promise<void>
}

export function useEarTagScanCameraGuideLoop({
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
}: UseEarTagScanCameraGuideLoopOptions) {
  useEffect(() => {
    if (cameraStep !== 'framing' || cameraStatus !== 'live') {
      if (guideLoopTimeoutRef.current) {
        window.clearTimeout(guideLoopTimeoutRef.current)
        guideLoopTimeoutRef.current = null
      }

      previousGuideFrameRef.current = null
      stableSinceRef.current = null
      captureInFlightRef.current = false
      autoCaptureRequestedRef.current = false
      setCaptureStabilityMs(null)

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

    const analysisCanvas = document.createElement('canvas')
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
        const now = performance.now()

        previousGuideFrameRef.current = nextAnalysis.grayscaleValues
        setCaptureGuides(nextAnalysis.guides)

        if (nextAnalysis.isStable) {
          if (stableSinceRef.current === null) {
            stableSinceRef.current = now
          }

          const remainingMs = Math.max(0, AUTO_CAPTURE_STABLE_MS - (now - stableSinceRef.current))
          setCaptureStabilityMs(remainingMs)

          if (
            remainingMs <= 0 &&
            !captureInFlightRef.current &&
            !autoCaptureRequestedRef.current
          ) {
            autoCaptureRequestedRef.current = true
            void capturePreview({ preferHighResolution: true, autoTriggered: true })
            return
          }
        } else {
          stableSinceRef.current = null
          autoCaptureRequestedRef.current = false
          setCaptureStabilityMs(null)
        }
      }

      guideLoopTimeoutRef.current = window.setTimeout(runGuideLoop, 420)
    }

    runGuideLoop()

    return () => {
      cancelled = true
      previousGuideFrameRef.current = null
      stableSinceRef.current = null
      captureInFlightRef.current = false
      autoCaptureRequestedRef.current = false

      if (guideLoopTimeoutRef.current) {
        window.clearTimeout(guideLoopTimeoutRef.current)
        guideLoopTimeoutRef.current = null
      }
    }
  }, [
    analysisCanvasRef,
    autoCaptureRequestedRef,
    cameraStatus,
    cameraStep,
    captureInFlightRef,
    capturePreview,
    guideLoopTimeoutRef,
    previousGuideFrameRef,
    setCaptureGuides,
    setCaptureStabilityMs,
    stableSinceRef,
    videoRef,
  ])
}
