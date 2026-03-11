import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import {
  buildRankedEarTagSuggestions,
  describeOcrError,
  describeOcrStatus,
  describeRecognitionMessage,
  ocrInitialMessage,
  prepareOcrVariants,
  type CaptureGuide,
  type EarTagSuggestion,
  type KnownEarTagIndex,
  type OcrPassResult,
} from '@/lib/animals/ear-tag-ocr'
import type { OcrStatus } from '@/components/animals/ear-tag-scan-types'

type TesseractModule = typeof import('tesseract.js')
type OcrWorker = Awaited<ReturnType<TesseractModule['createWorker']>>

type UseEarTagScanOcrOptions = {
  value: string
  onApplyValue: (value: string) => void
  scanDraft: string | null
  setScanDraft: Dispatch<SetStateAction<string | null>>
  setCaptureGuides: Dispatch<SetStateAction<CaptureGuide[]>>
  knownEarTagIndex: KnownEarTagIndex | null
}

export function useEarTagScanOcr({
  value,
  onApplyValue,
  scanDraft,
  setScanDraft,
  setCaptureGuides,
  knownEarTagIndex,
}: UseEarTagScanOcrOptions) {
  const isMountedRef = useRef(true)
  const ocrWorkerRef = useRef<OcrWorker | null>(null)
  const ocrWorkerPromiseRef = useRef<Promise<OcrWorker> | null>(null)
  const ocrRequestIdRef = useRef(0)
  const ocrActiveRequestIdRef = useRef(0)
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrMessage, setOcrMessage] = useState(ocrInitialMessage)
  const [ocrError, setOcrError] = useState('')
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState<string | null>(null)
  const [ocrSuggestions, setOcrSuggestions] = useState<EarTagSuggestion[]>([])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      ocrRequestIdRef.current += 1
      ocrActiveRequestIdRef.current = ocrRequestIdRef.current

      const worker = ocrWorkerRef.current
      ocrWorkerRef.current = null
      ocrWorkerPromiseRef.current = null

      if (worker) {
        void worker.terminate().catch(() => {})
      }
    }
  }, [])

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
      setOcrMessage('Foto wird für OCR vorbereitet')
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

          const passSuggestions = buildRankedEarTagSuggestions(
            [
              {
                text: result.data.text,
                confidence: result.data.confidence,
              },
            ],
            knownEarTagIndex,
          )
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
              detail: 'Tag größer, heller oder ruhiger aufnehmen',
              tone: 'alert',
            },
            {
              label: 'Manuell bleibt möglich',
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
                ? 'Ergebnis unten kurz bestätigen'
                : suggestions.length > 1
                  ? 'Alternativen unten vergleichen'
                  : 'Ergebnis unten genau prüfen',
            tone: bestSuggestion.confidence >= 70 ? 'good' : 'warn',
          },
          {
            label: `Erkannt: ${bestSuggestion.value}`,
            detail:
              suggestions.length > 1
                ? `${suggestions.length} Vorschläge verfügbar`
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
    [getOcrWorker, knownEarTagIndex, setCaptureGuides, setScanDraft],
  )

  const rereadCapture = useCallback((canvasElement: HTMLCanvasElement | null) => {
    if (!canvasElement) {
      setOcrStatus('error')
      setOcrError('Foto steht nicht mehr für OCR bereit.')
      return
    }

    void readEarTagFromCapture(canvasElement)
  }, [readEarTagFromCapture])

  const applyDraft = useCallback(() => {
    const cleanedDraft = (scanDraft ?? value).trim()
    if (!cleanedDraft) {
      return
    }

    onApplyValue(cleanedDraft)
  }, [onApplyValue, scanDraft, value])

  return {
    ocrStatus,
    ocrProgress,
    ocrMessage,
    ocrError,
    ocrPreviewUrl,
    ocrSuggestions,
    resetOcrState,
    readEarTagFromCapture,
    rereadCapture,
    applyDraft,
  }
}
