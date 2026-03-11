import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import type { SettingsTileCachePanelProps } from '@/components/settings/settings-tile-cache-panel'
import type { SettingsStorageMode } from '@/components/settings/settings-options'
import {
  clearTileCacheStorage,
  getPersistentStorageStatus,
  getTileCacheCount,
  requestPersistentStorage,
  TILE_CACHE_CHANGED_EVENT,
} from '@/lib/maps/tile-cache'
import { withTimeout } from '@/lib/settings/page-helpers'

type UseSettingsTileCacheStateOptions = {
  settingsReady: boolean
  settingsStorageMode: SettingsStorageMode
  setStatus: Dispatch<SetStateAction<string>>
}

export function useSettingsTileCacheState({
  settingsReady,
  settingsStorageMode,
  setStatus,
}: UseSettingsTileCacheStateOptions) {
  const [tileCacheCount, setTileCacheCount] = useState<number | null>(null)
  const [tileCacheLoading, setTileCacheLoading] = useState(true)
  const [tileCacheClearing, setTileCacheClearing] = useState(false)
  const [tileCacheSupported, setTileCacheSupported] = useState(false)
  const [isTileCacheOpen, setIsTileCacheOpen] = useState(false)
  const [persistentStorageGranted, setPersistentStorageGranted] = useState<boolean | null>(null)
  const [persistentStorageLoading, setPersistentStorageLoading] = useState(false)
  const hasStoredTiles = tileCacheCount !== null && tileCacheCount > 0

  useEffect(() => {
    setTileCacheSupported(typeof window !== 'undefined' && 'caches' in window)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadPersistentStorageStatus() {
      try {
        const nextStatus = await withTimeout(getPersistentStorageStatus())
        if (!cancelled) {
          setPersistentStorageGranted(nextStatus)
        }
      } catch {
        if (!cancelled) {
          setPersistentStorageGranted(null)
        }
      }
    }

    void loadPersistentStorageStatus()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let isCancelled = false

    async function refreshTileCache() {
      setTileCacheLoading(true)

      try {
        const nextCount = await withTimeout(getTileCacheCount())
        if (!isCancelled) {
          setTileCacheCount(nextCount)
        }
      } catch {
        if (!isCancelled) {
          setTileCacheCount(null)
        }
      } finally {
        if (!isCancelled) {
          setTileCacheLoading(false)
        }
      }
    }

    void refreshTileCache()

    const handleFocus = () => {
      void refreshTileCache()
    }

    const handleTileCacheChanged = () => {
      void refreshTileCache()
    }

    const handleWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TILE_CACHE_UPDATED') {
        void refreshTileCache()
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshTileCache()
      }
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener(TILE_CACHE_CHANGED_EVENT, handleTileCacheChanged)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    navigator.serviceWorker?.addEventListener('message', handleWorkerMessage)

    return () => {
      isCancelled = true
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener(TILE_CACHE_CHANGED_EVENT, handleTileCacheChanged)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      navigator.serviceWorker?.removeEventListener('message', handleWorkerMessage)
    }
  }, [settingsReady])

  async function syncAfterSettingsSave(tileCachingEnabled: boolean) {
    if (tileCachingEnabled) {
      const persistent = await withTimeout(requestPersistentStorage())
      setPersistentStorageGranted(persistent)
    }

    if (!tileCachingEnabled) {
      await withTimeout(clearTileCacheStorage())
    }

    setTileCacheCount(await withTimeout(getTileCacheCount()))
  }

  async function clearTileCache() {
    setTileCacheClearing(true)
    setStatus('')

    try {
      const cleared = await withTimeout(clearTileCacheStorage())
      if (cleared) {
        setTileCacheCount(0)
        setStatus('Tile-Cache geleert.')
      } else {
        setStatus('Tile-Cache konnte auf diesem Gerät nicht vollständig geleert werden.')
      }
    } finally {
      setTileCacheClearing(false)
    }
  }

  async function enablePersistentStorage() {
    setPersistentStorageLoading(true)

    try {
      const granted = await withTimeout(requestPersistentStorage())
      setPersistentStorageGranted(granted)
      setStatus(
        granted
          ? 'Permanenter Speicher wurde angefragt und gewährt.'
          : 'Permanenter Speicher konnte nicht dauerhaft zugesichert werden.'
      )
    } finally {
      setPersistentStorageLoading(false)
    }
  }

  function buildTileCachePanel(tileCachingEnabled: boolean): SettingsTileCachePanelProps {
    return {
      tileCachingEnabled,
      tileCacheSupported,
      tileCacheLoading,
      tileCacheClearing,
      tileCacheCount,
      hasStoredTiles,
      isOpen: isTileCacheOpen,
      settingsStorageMode,
      persistentStorageGranted,
      persistentStorageLoading,
      onToggleOpen: () => setIsTileCacheOpen((current) => !current),
      onEnablePersistentStorage: enablePersistentStorage,
      onClearTileCache: clearTileCache,
    }
  }

  return {
    tileCacheCount,
    setTileCacheCount,
    syncAfterSettingsSave,
    buildTileCachePanel,
  }
}
