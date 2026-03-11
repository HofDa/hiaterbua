import { useCallback, useEffect } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import {
  describeCameraError,
  stopMediaStream,
} from '@/lib/animals/ear-tag-camera'
import {
  defaultCaptureGuides,
  type CaptureGuide,
} from '@/lib/animals/ear-tag-ocr'
import type {
  CameraStatus,
  CameraStep,
  ScanMode,
} from '@/components/animals/ear-tag-scan-types'

type UseEarTagScanCameraLifecycleOptions = {
  disabled: boolean
  supportsCamera: boolean
  videoRef: MutableRefObject<HTMLVideoElement | null>
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
  setCaptureGuides: Dispatch<SetStateAction<CaptureGuide[]>>
  resetOcrState: (options?: { preserveDraft?: boolean }) => void
}

export function useEarTagScanCameraLifecycle({
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
}: UseEarTagScanCameraLifecycleOptions) {
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      requestIdRef.current += 1
      if (guideLoopTimeoutRef.current) {
        window.clearTimeout(guideLoopTimeoutRef.current)
        guideLoopTimeoutRef.current = null
      }
      previousGuideFrameRef.current = null
      stableSinceRef.current = null
      captureInFlightRef.current = false
      autoCaptureRequestedRef.current = false
      stopMediaStream(streamRef.current)
      streamRef.current = null
    }
  }, [
    autoCaptureRequestedRef,
    captureInFlightRef,
    guideLoopTimeoutRef,
    isMountedRef,
    previousGuideFrameRef,
    requestIdRef,
    stableSinceRef,
    streamRef,
  ])

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
  }, [cameraStep, cameraStatus, streamRef, videoRef])

  const stopActiveCamera = useCallback(() => {
    requestIdRef.current += 1
    stopMediaStream(streamRef.current)
    streamRef.current = null
    setCameraStatus('idle')
    setCaptureStabilityMs(null)
    stableSinceRef.current = null
    autoCaptureRequestedRef.current = false
  }, [
    autoCaptureRequestedRef,
    requestIdRef,
    setCameraStatus,
    setCaptureStabilityMs,
    stableSinceRef,
    streamRef,
  ])

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
    setCaptureStabilityMs(null)

    if (!supportsCamera) {
      setCameraStep('ready')
      setCameraStatus('idle')
      setCameraError('Dieses Gerät oder dieser Browser bietet keine Web-Kamera an.')
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

  return {
    stopActiveCamera,
    switchMode,
    startCameraFraming,
  }
}
