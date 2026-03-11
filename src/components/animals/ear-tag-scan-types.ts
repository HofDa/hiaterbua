export type EarTagScanPanelProps = {
  disabled?: boolean
  knownEarTags?: string[]
  conflictIgnoreEarTag?: string | null
  value: string
  onApplyValue: (value: string) => void
}

export type ScanMode = 'manual' | 'camera'
export type CameraStep = 'ready' | 'framing' | 'captured'
export type CameraStatus = 'idle' | 'starting' | 'live'
export type OcrStatus = 'idle' | 'preparing' | 'reading' | 'ready' | 'error'
