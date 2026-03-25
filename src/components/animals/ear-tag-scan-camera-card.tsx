'use client'

import Image from 'next/image'
import type { RefObject } from 'react'
import {
  guideToneClasses,
  OCR_FRAME_HEIGHT_RATIO,
  OCR_FRAME_WIDTH_RATIO,
  type CaptureGuide,
} from '@/lib/animals/ear-tag-ocr'
import type { CameraStatus, CameraStep } from '@/components/animals/ear-tag-scan-types'
import { Card, CardContent } from '@/components/ui/card'
import { FormButton } from '@/components/ui/form'
import { ErrorAlert } from '@/components/ui/alert'

type EarTagScanCameraCardProps = {
  disabled: boolean
  supportsCamera: boolean
  isCapturingPhoto: boolean
  isReadingOcr: boolean
  cameraStep: CameraStep
  cameraStatus: CameraStatus
  cameraGuideTitle: string
  cameraGuideDetail: string
  capturedImageUrl: string | null
  captureGuides: CaptureGuide[]
  cameraError: string
  videoRef: RefObject<HTMLVideoElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  onStartCameraFraming: () => void
  onCapturePreview: () => void
  onResetCapture: () => void
  onRereadCapture: () => void
}

export function EarTagScanCameraCard({
  disabled,
  supportsCamera,
  isCapturingPhoto,
  isReadingOcr,
  cameraStep,
  cameraStatus,
  cameraGuideTitle,
  cameraGuideDetail,
  capturedImageUrl,
  captureGuides,
  cameraError,
  videoRef,
  canvasRef,
  onStartCameraFraming,
  onCapturePreview,
  onResetCapture,
  onRereadCapture,
}: EarTagScanCameraCardProps) {
  return (
    <Card>
      <CardContent>
        <Card className="rounded-[1rem] border border-[#d8ccb2] bg-[#f7f2e7] px-4 py-3 shadow-sm">
          <CardContent>
            <div className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-700">
              {cameraGuideTitle}
            </div>
            <div className="mt-1 text-sm font-medium text-neutral-900">{cameraGuideDetail}</div>
          </CardContent>
        </Card>

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
              <div className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-[rgba(255,253,246,0.4)]" />
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
        {cameraStep === 'ready' && (
          <FormButton
            type="button"
            onClick={onStartCameraFraming}
            disabled={disabled || !supportsCamera}
            variant="primary"
          >
            {supportsCamera ? 'Kamera vorbereiten' : 'Kamera nicht verfügbar'}
          </FormButton>
        )}

        {cameraStep === 'framing' && (
          <>
            <FormButton
              type="button"
              onClick={onCapturePreview}
              disabled={disabled || cameraStatus !== 'live' || isCapturingPhoto}
              variant="primary"
            >
              {cameraStatus === 'starting'
                ? 'Kamera startet ...'
                : isCapturingPhoto
                  ? 'Foto wird aufgenommen ...'
                  : 'Foto aufnehmen'}
            </FormButton>
            <FormButton
              type="button"
              onClick={onResetCapture}
              variant="secondary"
            >
              Abbrechen
            </FormButton>
          </>
        )}

        {cameraStep === 'captured' && (
          <>
            <FormButton
              type="button"
              onClick={onRereadCapture}
              disabled={disabled || isReadingOcr}
              variant="primary"
            >
              {isReadingOcr ? 'OCR liest ...' : 'Erneut lesen'}
            </FormButton>
            <FormButton
              type="button"
              onClick={onStartCameraFraming}
              disabled={isReadingOcr}
              variant="secondary"
            >
              Neu aufnehmen
            </FormButton>
            <FormButton
              type="button"
              onClick={onResetCapture}
              disabled={isReadingOcr}
              variant="secondary"
            >
              Verwerfen
            </FormButton>
          </>
        )}
      </div>

      {cameraError && (
        <ErrorAlert className="mt-4">{cameraError}</ErrorAlert>
      )}
      </CardContent>
    </Card>
  )
}
