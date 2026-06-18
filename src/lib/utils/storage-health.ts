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
