import { useCallback } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import {
  describeCameraError,
  drawBlobToCanvas,
  getImageCapture,
} from '@/lib/animals/ear-tag-camera'
import {
  defaultCaptureGuides,
  type CaptureGuide,
} from '@/lib/animals/ear-tag-ocr'
import type {
  CameraStep,
} from '@/components/animals/ear-tag-scan-types'

type UseEarTagScanCameraCaptureOptions = {
  value: string
  videoRef: MutableRefObject<HTMLVideoElement | null>
  canvasRef: MutableRefObject<HTMLCanvasElement | null>
  streamRef: MutableRefObject<MediaStream | null>
  captureInFlightRef: MutableRefObject<boolean>
  autoCaptureRequestedRef: MutableRefObject<boolean>
  requestIdRef: MutableRefObject<number>
  isMountedRef: MutableRefObject<boolean>
  cameraStep: CameraStep
  setCameraStep: Dispatch<SetStateAction<CameraStep>>
  setCameraError: Dispatch<SetStateAction<string>>
  setCapturedImageUrl: Dispatch<SetStateAction<string | null>>
  setIsCapturingPhoto: Dispatch<SetStateAction<boolean>>
  setScanDraft: Dispatch<SetStateAction<string | null>>
  setCaptureGuides: Dispatch<SetStateAction<CaptureGuide[]>>
  setCaptureStabilityMs: Dispatch<SetStateAction<number | null>>
  stopActiveCamera: () => void
  resetOcrState: (options?: { preserveDraft?: boolean }) => void
  readEarTagFromCapture: (sourceCanvas: HTMLCanvasElement) => Promise<void>
}

export function useEarTagScanCameraCapture({
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
}: UseEarTagScanCameraCaptureOptions) {
  const capturePreview = useCallback(
    async (options?: { preferHighResolution?: boolean; autoTriggered?: boolean }) => {
      const videoElement = videoRef.current
      const canvasElement = canvasRef.current
      const activeStream = streamRef.current

      if (!videoElement || !canvasElement || !activeStream || captureInFlightRef.current) {
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

      const activeRequestId = requestIdRef.current
      let usedPhotoCapture = false

      captureInFlightRef.current = true
      autoCaptureRequestedRef.current = Boolean(options?.autoTriggered)
      setIsCapturingPhoto(true)

      try {
        if (options?.preferHighResolution) {
          const videoTrack = activeStream.getVideoTracks()[0]
          const imageCapture = videoTrack ? getImageCapture(videoTrack) : null

          if (imageCapture) {
            try {
              const blob = await imageCapture.takePhoto()

              if (
                requestIdRef.current !== activeRequestId ||
                cameraStep !== 'framing' ||
                !isMountedRef.current
              ) {
                return
              }

              await drawBlobToCanvas(blob, canvasElement)
              usedPhotoCapture = true
            } catch {
              usedPhotoCapture = false
            }
          }
        }

        if (!usedPhotoCapture) {
          canvasElement.width = videoElement.videoWidth
          canvasElement.height = videoElement.videoHeight
          context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height)
        }

        if (
          requestIdRef.current !== activeRequestId ||
          cameraStep !== 'framing' ||
          !isMountedRef.current
        ) {
          return
        }

        setCapturedImageUrl(canvasElement.toDataURL('image/jpeg', 0.92))
        stopActiveCamera()
        setCameraStep('captured')
        setCameraError('')
        setCaptureGuides([
          {
            label: 'Foto aufgenommen',
            detail: usedPhotoCapture
              ? 'Hochauflösendes Kamerafoto wird jetzt für OCR gelesen'
              : 'Videobild wird jetzt für OCR gelesen',
            tone: 'good',
          },
        ])
        setScanDraft((currentDraft) => {
          if (currentDraft?.trim()) {
            return currentDraft
          }

          return value.trim() || null
        })

        await readEarTagFromCapture(canvasElement)
      } catch (error) {
        if (requestIdRef.current === activeRequestId && isMountedRef.current) {
          setCameraError(describeCameraError(error))
        }
      } finally {
        captureInFlightRef.current = false
        if (isMountedRef.current) {
          setIsCapturingPhoto(false)
        }
      }
    },
    [
      autoCaptureRequestedRef,
      cameraStep,
      canvasRef,
      captureInFlightRef,
      isMountedRef,
      readEarTagFromCapture,
      requestIdRef,
      setCameraError,
      setCameraStep,
      setCaptureGuides,
      setCapturedImageUrl,
      setIsCapturingPhoto,
      setScanDraft,
      stopActiveCamera,
      streamRef,
      value,
      videoRef,
    ]
  )

  function resetCapture() {
    stopActiveCamera()
    setCameraStep('ready')
    setCapturedImageUrl(null)
    setCameraError('')
    setCaptureGuides(defaultCaptureGuides)
    setCaptureStabilityMs(null)
    resetOcrState()
  }

  return {
    capturePreview,
    resetCapture,
  }
}
