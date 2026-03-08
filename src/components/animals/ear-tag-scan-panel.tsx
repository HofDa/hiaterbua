'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AUTO_CAPTURE_STABLE_MS,
  describeCameraError,
  drawBlobToCanvas,
  getImageCapture,
  stopMediaStream,
} from '@/lib/animals/ear-tag-camera'
import {
  analyzeFrameGuidance,
  buildKnownEarTagIndex,
  buildRankedEarTagSuggestions,
  defaultCaptureGuides,
  describeOcrError,
  describeOcrStatus,
  describeRecognitionMessage,
  findKnownEarTagMatch,
  guideToneClasses,
  isSameEarTag,
  OCR_FRAME_HEIGHT_RATIO,
  OCR_FRAME_WIDTH_RATIO,
  ocrInitialMessage,
  prepareOcrVariants,
  type CaptureGuide,
  type EarTagSuggestion,
  type OcrPassResult,
} from '@/lib/animals/ear-tag-ocr'

type EarTagScanPanelProps = {
  disabled?: boolean
  knownEarTags?: string[]
  conflictIgnoreEarTag?: string | null
  value: string
  onApplyValue: (value: string) => void
}

type ScanMode = 'manual' | 'camera'
type CameraStep = 'ready' | 'framing' | 'captured'
type CameraStatus = 'idle' | 'starting' | 'live'
type OcrStatus = 'idle' | 'preparing' | 'reading' | 'ready' | 'error'
type TesseractModule = typeof import('tesseract.js')
type OcrWorker = Awaited<ReturnType<TesseractModule['createWorker']>>

export function EarTagScanPanel({
  disabled = false,
  knownEarTags = [],
  conflictIgnoreEarTag = null,
  value,
  onApplyValue,
}: EarTagScanPanelProps) {
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
  const [captureStabilityMs, setCaptureStabilityMs] = useState<number | null>(null)
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false)

  const supportsCamera =
    typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
  const effectiveDraft = scanDraft ?? value
  const cleanedDraft = effectiveDraft.trim()
  const knownEarTagIndex = useMemo(
    () => (knownEarTags.length ? buildKnownEarTagIndex(knownEarTags) : null),
    [knownEarTags],
  )
  const selectedKnownMatch = useMemo(
    () => findKnownEarTagMatch(effectiveDraft, knownEarTagIndex),
    [effectiveDraft, knownEarTagIndex],
  )
  const selectedKnownConflict =
    selectedKnownMatch && !isSameEarTag(selectedKnownMatch.canonical, conflictIgnoreEarTag)
      ? selectedKnownMatch
      : null
  const isReadingOcr = ocrStatus === 'preparing' || ocrStatus === 'reading'
  const stabilityCountdownSeconds =
    captureStabilityMs !== null
      ? Math.max(0, Math.ceil(captureStabilityMs / 100) / 10).toFixed(1)
      : null
  const cameraGuideTitle =
    isCapturingPhoto
      ? 'Foto wird aufgenommen'
      : cameraStep === 'ready'
      ? 'Kamera bereit'
      : cameraStep === 'framing'
        ? cameraStatus === 'starting'
          ? 'Kamera startet'
          : 'Scan-Fokus'
        : 'Ergebnis pruefen'
  const cameraGuideDetail =
    isCapturingPhoto
      ? 'Wenn moeglich wird gerade ein hochaufloesendes Kamerafoto erstellt.'
      : cameraStep === 'ready'
      ? 'Rueckkamera wird genutzt, wenn das Geraet sie anbietet.'
      : cameraStep === 'framing'
        ? cameraStatus === 'starting'
          ? 'Bitte kurz warten, bis das Kamerabild erscheint.'
          : captureStabilityMs !== null
            ? captureStabilityMs > 0
              ? `Noch ${stabilityCountdownSeconds}s ruhig halten, dann wird automatisch fotografiert.`
              : 'Bild ist stabil. Foto wird automatisch aufgenommen.'
            : 'Ohrmarke moeglichst frontal und allein in den Rahmen nehmen.'
        : isReadingOcr
          ? 'OCR liest jetzt den markierten Mittelbereich.'
          : 'Foto ansehen und Ergebnis darunter pruefen.'
  const cameraStateLabel =
    isCapturingPhoto
      ? 'Foto wird aufgenommen'
      : cameraStep === 'captured'
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
      stableSinceRef.current = null
      captureInFlightRef.current = false
      autoCaptureRequestedRef.current = false
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

  function stopActiveCamera() {
    requestIdRef.current += 1
    stopMediaStream(streamRef.current)
    streamRef.current = null
    setCameraStatus('idle')
    setCaptureStabilityMs(null)
    stableSinceRef.current = null
    autoCaptureRequestedRef.current = false
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

  const getOcrWorker = useCallback(async () => {
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
  }, [])

  const readEarTagFromCapture = useCallback(
    async (sourceCanvas: HTMLCanvasElement) => {
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
          ], knownEarTagIndex)
          const bestPassSuggestion = passSuggestions[0]

          if (
            bestPassSuggestion &&
            (bestPassSuggestion.score >= 24 ||
              (variantIndex === 0 && bestPassSuggestion.confidence >= 74))
          ) {
            break
          }
        }

        const suggestions = buildRankedEarTagSuggestions(recognitionResults, knownEarTagIndex)
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
    },
    [getOcrWorker, knownEarTagIndex],
  )

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
              ? 'Hochaufloesendes Kamerafoto wird jetzt fuer OCR gelesen'
              : 'Videobild wird jetzt fuer OCR gelesen',
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
    [cameraStep, readEarTagFromCapture, value],
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
  }, [cameraStep, cameraStatus, capturePreview])

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
                    onClick={() => void capturePreview({ preferHighResolution: true })}
                    disabled={disabled || cameraStatus !== 'live' || isCapturingPhoto}
                    className="rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-3 text-sm font-semibold text-neutral-950 shadow-sm disabled:opacity-50"
                  >
                    {cameraStatus === 'starting'
                      ? 'Kamera startet ...'
                      : isCapturingPhoto
                        ? 'Foto wird aufgenommen ...'
                        : 'Foto aufnehmen'}
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

            {selectedKnownConflict ? (
              <div className="mt-3 rounded-[1rem] border border-[#d9b37a] bg-[#fbf2dd] px-4 py-3 text-sm font-medium text-[#5e4320]">
                {selectedKnownConflict.relationship === 'exact'
                  ? `Diese Ohrmarke ist bereits in der Datenbank vorhanden: ${selectedKnownConflict.canonical}`
                  : `Der erkannte Ziffernblock passt zu einer vorhandenen Ohrmarke: ${selectedKnownConflict.canonical}`}
              </div>
            ) : null}

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
                          {suggestion.knownMatch?.relationship === 'exact'
                            ? 'DB'
                            : index === 0
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
