'use client'

import { EarTagScanCameraCard } from '@/components/animals/ear-tag-scan-camera-card'
import { EarTagScanResultCard } from '@/components/animals/ear-tag-scan-result-card'
import { useEarTagScanController } from '@/components/animals/hooks/use-ear-tag-scan-controller'
import type { EarTagScanPanelProps } from '@/components/animals/ear-tag-scan-types'

export function EarTagScanPanel(props: EarTagScanPanelProps) {
  const controller = useEarTagScanController(props)

  return (
    <div className="rounded-[1.4rem] border border-[#ccb98a] bg-[#f6efdf] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-700">
            Ohrmarke erfassen
          </h3>
          <p className="mt-1 text-sm text-neutral-700">
            Manuell eingeben oder direkt über die Kamera fotografieren und vorprüfen.
          </p>
        </div>
        <div className="rounded-full border border-[#ccb98a] bg-[#fffdf6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-neutral-700">
          {controller.cameraStateLabel}
        </div>
      </div>

      <div className="mt-4 inline-flex rounded-full border border-[#ccb98a] bg-[#fffdf6] p-1 shadow-sm">
        <button
          type="button"
          onClick={() => controller.switchMode('manual')}
          disabled={controller.isReadingOcr}
          className={[
            'rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50',
            controller.mode === 'manual'
              ? 'border border-[#5a5347] bg-[#f1efeb] text-neutral-950'
              : 'border border-transparent bg-transparent text-neutral-700',
          ].join(' ')}
        >
          Manuell
        </button>
        <button
          type="button"
          onClick={() => controller.switchMode('camera')}
          disabled={controller.isReadingOcr}
          className={[
            'rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50',
            controller.mode === 'camera'
              ? 'border border-[#5a5347] bg-[#f1efeb] text-neutral-950'
              : 'border border-transparent bg-transparent text-neutral-700',
          ].join(' ')}
        >
          Scan-Ansicht
        </button>
      </div>

      {controller.mode === 'manual' ? (
        <div className="mt-4 rounded-[1.2rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-4 text-sm text-neutral-700 shadow-sm">
          Ohrmarke direkt eintippen. Die Scan-Ansicht nutzt Kamera plus OCR und
          übernimmt den erkannten Wert erst nach deiner Kontrolle.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <EarTagScanCameraCard
            disabled={props.disabled ?? false}
            supportsCamera={controller.supportsCamera}
            isCapturingPhoto={controller.isCapturingPhoto}
            isReadingOcr={controller.isReadingOcr}
            cameraStep={controller.cameraStep}
            cameraStatus={controller.cameraStatus}
            cameraGuideTitle={controller.cameraGuideTitle}
            cameraGuideDetail={controller.cameraGuideDetail}
            capturedImageUrl={controller.capturedImageUrl}
            captureGuides={controller.captureGuides}
            cameraError={controller.cameraError}
            videoRef={controller.videoRef}
            canvasRef={controller.canvasRef}
            onStartCameraFraming={() => {
              void controller.startCameraFraming()
            }}
            onCapturePreview={() => {
              void controller.capturePreview({ preferHighResolution: true })
            }}
            onResetCapture={controller.resetCapture}
            onRereadCapture={controller.rereadCapture}
          />

          <EarTagScanResultCard
            disabled={props.disabled ?? false}
            isReadingOcr={controller.isReadingOcr}
            cameraStep={controller.cameraStep}
            effectiveDraft={controller.effectiveDraft}
            cleanedDraft={controller.cleanedDraft}
            ocrMessage={controller.ocrMessage}
            ocrError={controller.ocrError}
            ocrPreviewUrl={controller.ocrPreviewUrl}
            ocrSuggestions={controller.ocrSuggestions}
            ocrProgress={controller.ocrProgress}
            selectedKnownConflict={controller.selectedKnownConflict}
            onDraftChange={(nextValue) => controller.setScanDraft(nextValue)}
            onApplyDraft={controller.applyDraft}
          />
        </div>
      )}
    </div>
  )
}
