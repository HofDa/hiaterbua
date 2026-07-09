'use client'

// Live readout of the origin's storage usage/quota for settings & diagnostics.
// Mirrors the status-strip refresh pattern: re-read on focus/visibility and
// after tile-cache changes so the numbers stay current when the user returns
// to the tab or frees space.
import { useEffect, useState } from 'react'
import { TILE_CACHE_CHANGED_EVENT } from '@/lib/maps/tile-cache'
import {
  getStorageEstimate,
  getStorageHealthLevel,
  type StorageHealthLevel,
} from '@/lib/utils/storage-health'

export type StorageUsageStatus = 'loading' | 'ready' | 'unavailable'

export type StorageUsage = {
  status: StorageUsageStatus
  usageBytes: number | null
  quotaBytes: number | null
  ratio: number | null
  level: StorageHealthLevel | null
}

const emptyUsage: Omit<StorageUsage, 'status'> = {
  usageBytes: null,
  quotaBytes: null,
  ratio: null,
  level: null,
}

export function useStorageUsage(): StorageUsage {
  const [usage, setUsage] = useState<StorageUsage>({ status: 'loading', ...emptyUsage })

  useEffect(() => {
    let cancelled = false

    // getStorageEstimate never throws: it resolves to null when the API is
    // missing or rejects (private mode, older WebKit), so rendering is never
    // blocked by a storage probe.
    async function refreshStorageUsage() {
      const estimate = await getStorageEstimate()
      if (cancelled) return

      if (!estimate) {
        setUsage({ status: 'unavailable', ...emptyUsage })
        return
      }

      setUsage({
        status: 'ready',
        usageBytes: estimate.usage,
        quotaBytes: estimate.quota,
        ratio: estimate.ratio,
        level: getStorageHealthLevel(estimate.ratio),
      })
    }

    void refreshStorageUsage()

    const handleFocus = () => {
      void refreshStorageUsage()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshStorageUsage()
      }
    }

    const handleTileCacheChanged = () => {
      void refreshStorageUsage()
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener(TILE_CACHE_CHANGED_EVENT, handleTileCacheChanged)

    return () => {
      cancelled = true
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener(TILE_CACHE_CHANGED_EVENT, handleTileCacheChanged)
    }
  }, [])

  return usage
}
