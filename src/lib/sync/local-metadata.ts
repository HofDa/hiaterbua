import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type { LocalRecordMetadata, SyncStatus } from '@/types/domain'

export const LOCAL_DEVICE_ID_STORAGE_KEY = 'pastore:local-device-id'
export const DEFAULT_SYNC_STATUS: SyncStatus = 'dirty'

let memoryDeviceId: string | null = null

function createLocalDeviceId() {
  const cryptoApi = globalThis.crypto
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `device_${cryptoApi.randomUUID()}`
  }

  return createId('device')
}

export function getOrCreateLocalDeviceId(): string {
  if (memoryDeviceId) {
    return memoryDeviceId
  }

  try {
    const storage = globalThis.localStorage
    const existing = storage?.getItem(LOCAL_DEVICE_ID_STORAGE_KEY)
    if (existing) {
      memoryDeviceId = existing
      return existing
    }

    const nextDeviceId = createLocalDeviceId()
    storage?.setItem(LOCAL_DEVICE_ID_STORAGE_KEY, nextDeviceId)
    memoryDeviceId = nextDeviceId
    return nextDeviceId
  } catch {
    memoryDeviceId = createLocalDeviceId()
    return memoryDeviceId
  }
}

export function buildLocalChangeMetadata(timestamp = nowIso()): Required<LocalRecordMetadata> {
  return {
    deletedAt: null,
    deviceId: getOrCreateLocalDeviceId(),
    syncStatus: DEFAULT_SYNC_STATUS,
    lastLocalChangeAt: timestamp,
  }
}

export function buildLocalChangePatch(timestamp = nowIso()): LocalRecordMetadata {
  return {
    deviceId: getOrCreateLocalDeviceId(),
    syncStatus: DEFAULT_SYNC_STATUS,
    lastLocalChangeAt: timestamp,
  }
}

export function getRecordChangeTimestamp(record: Record<string, unknown>, fallback = nowIso()) {
  const candidates = [
    record.lastLocalChangeAt,
    record.updatedAt,
    record.timestamp,
    record.createdAt,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate
    }
  }

  return fallback
}

