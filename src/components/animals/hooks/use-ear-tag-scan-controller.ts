'use client'

import { useMemo, useState } from 'react'
import {
  buildKnownEarTagIndex,
  findKnownEarTagMatch,
  isSameEarTag,
} from '@/lib/animals/ear-tag-ocr-text'
import { defaultCaptureGuides } from '@/lib/animals/ear-tag-ocr-types'
import { useEarTagScanCamera } from '@/components/animals/hooks/use-ear-tag-scan-camera'
import { useEarTagScanOcr } from '@/components/animals/hooks/use-ear-tag-scan-ocr'
import type { EarTagScanPanelProps } from '@/components/animals/ear-tag-scan-types'

export function useEarTagScanController({
  disabled = false,
  knownEarTags = [],
  conflictIgnoreEarTag = null,
  value,
  onApplyValue,
}: EarTagScanPanelProps) {
  const [scanDraft, setScanDraft] = useState<string | null>(null)
  const [captureGuides, setCaptureGuides] = useState(defaultCaptureGuides)

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

  const {
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
  } = useEarTagScanOcr({
    value,
    onApplyValue,
    scanDraft,
    setScanDraft,
    setCaptureGuides,
    knownEarTagIndex,
  })

  const {
    videoRef,
    canvasRef,
    mode,
    cameraStep,
    cameraStatus,
    cameraError,
    capturedImageUrl,
    isCapturingPhoto,
    cameraGuideTitle,
    cameraGuideDetail,
    cameraStateLabel,
    switchMode,
    startCameraFraming,
    capturePreview,
    resetCapture,
  } = useEarTagScanCamera({
    disabled,
    supportsCamera,
    value,
    ocrStatus,
    ocrProgress,
    setScanDraft,
    setCaptureGuides,
    resetOcrState,
    readEarTagFromCapture,
  })

  const isReadingOcr = ocrStatus === 'preparing' || ocrStatus === 'reading'

  return {
    videoRef,
    canvasRef,
    mode,
    cameraStep,
    cameraStatus,
    cameraError,
    capturedImageUrl,
    effectiveDraft,
    cleanedDraft,
    selectedKnownConflict,
    isReadingOcr,
    ocrMessage,
    ocrError,
    ocrPreviewUrl,
    ocrSuggestions,
    ocrProgress,
    captureGuides,
    supportsCamera,
    isCapturingPhoto,
    cameraGuideTitle,
    cameraGuideDetail,
    cameraStateLabel,
    setScanDraft,
    switchMode,
    startCameraFraming,
    capturePreview,
    resetCapture,
    rereadCapture: () => rereadCapture(canvasRef.current),
    applyDraft,
  }
}
