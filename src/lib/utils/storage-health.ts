// Helpers for guarding the user's local field data against storage problems.
// IndexedDB writes can fail when the device runs out of quota; these utilities
// let the recording paths detect that case and warn before data is lost.
import { logError } from '@/lib/utils/log'

export function isQuotaExceededError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const name = (error as { name?: unknown }).name
  if (typeof name === 'string' && name.toLowerCase().includes('quota')) {
    return true
  }

  // Dexie wraps the underlying DOMException on `.inner`.
  const inner = (error as { inner?: unknown }).inner
  return inner ? isQuotaExceededError(inner) : false
}

export type StorageEstimate = {
  usage: number
  quota: number
  ratio: number
}

// Single source of truth for "storage is getting dangerously full". The GPS
// recording path warns at this ratio; the settings/diagnostics readouts must
// flip to their warning state at exactly the same point.
export const STORAGE_WARNING_RATIO = 0.9

export type StorageHealthLevel = 'ok' | 'warning'

export function getStorageHealthLevel(ratio: number): StorageHealthLevel {
  return Number.isFinite(ratio) && ratio >= STORAGE_WARNING_RATIO ? 'warning' : 'ok'
}

const STORAGE_BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

// Formats byte counts for German UI copy ("234,5 MB", "2,0 GB"). Uses a
// hand-rolled comma instead of Intl so the output is deterministic regardless
// of the device locale.
export function formatStorageBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'

  let value = bytes
  let unitIndex = 0
  while (value >= 1000 && unitIndex < STORAGE_BYTE_UNITS.length - 1) {
    value /= 1000
    unitIndex += 1
  }

  if (unitIndex === 0) return `${Math.round(value)} B`

  return `${value.toFixed(1).replace('.', ',')} ${STORAGE_BYTE_UNITS[unitIndex]}`
}

export function formatStorageRatioPercent(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio < 0) return '0 %'

  return `${Math.min(100, Math.round(ratio * 100))} %`
}

export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return null
  }

  try {
    const { usage, quota } = await navigator.storage.estimate()
    if (typeof usage !== 'number' || typeof quota !== 'number' || quota <= 0) {
      return null
    }

    return { usage, quota, ratio: usage / quota }
  } catch (error) {
    logError('getStorageEstimate', error)
    return null
  }
}
