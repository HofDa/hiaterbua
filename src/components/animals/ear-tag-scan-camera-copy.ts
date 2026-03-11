import type {
  CameraStatus,
  CameraStep,
  OcrStatus,
} from '@/components/animals/ear-tag-scan-types'

export function getEarTagScanCameraCopy(params: {
  isCapturingPhoto: boolean
  cameraStep: CameraStep
  cameraStatus: CameraStatus
  captureStabilityMs: number | null
  ocrStatus: OcrStatus
  ocrProgress: number
}) {
  const {
    isCapturingPhoto,
    cameraStep,
    cameraStatus,
    captureStabilityMs,
    ocrStatus,
    ocrProgress,
  } = params
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
          : 'Ergebnis prüfen'

  const cameraGuideDetail =
    isCapturingPhoto
      ? 'Wenn möglich wird gerade ein hochauflösendes Kamerafoto erstellt.'
      : cameraStep === 'ready'
        ? 'Rückkamera wird genutzt, wenn das Gerät sie anbietet.'
        : cameraStep === 'framing'
          ? cameraStatus === 'starting'
            ? 'Bitte kurz warten, bis das Kamerabild erscheint.'
            : captureStabilityMs !== null
              ? captureStabilityMs > 0
                ? `Noch ${stabilityCountdownSeconds}s ruhig halten, dann wird automatisch fotografiert.`
                : 'Bild ist stabil. Foto wird automatisch aufgenommen.'
              : 'Ohrmarke möglichst frontal und allein in den Rahmen nehmen.'
          : isReadingOcr
            ? 'OCR liest jetzt den markierten Mittelbereich.'
            : 'Foto ansehen und Ergebnis darunter prüfen.'

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
                ? 'OCR prüfen'
                : 'Foto bereit'
        : cameraStatus === 'live'
          ? 'Kamera live'
          : cameraStatus === 'starting'
            ? 'Kamera startet'
            : 'Kamera aus'

  return {
    cameraGuideTitle,
    cameraGuideDetail,
    cameraStateLabel,
  }
}
