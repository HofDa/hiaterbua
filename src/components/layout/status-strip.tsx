'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { db } from '@/lib/db/dexie'
import {
  getPersistentStorageStatus,
  getTileCacheCount,
  TILE_CACHE_CHANGED_EVENT,
} from '@/lib/maps/tile-cache'
import { defaultAppSettings } from '@/lib/settings/defaults'
import {
  parseFallbackSettingsSnapshot,
  readFallbackSettingsSnapshot,
  subscribeToFallbackSettings,
} from '@/lib/settings/page-helpers'
import { cn } from '@/lib/utils/cn'

function chromeBadgeClass(isActive: boolean, className?: string) {
  return cn(
    'whitespace-nowrap rounded-full border px-3 py-1.5 font-semibold',
    isActive ? 'app-chrome-active' : 'app-chrome-control',
    className,
  )
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function subscribeToHydration() {
  return () => {}
}

export function StatusStrip() {
  const [isOnline, setIsOnline] = useState(true)
  const [tileCacheCount, setTileCacheCount] = useState<number | null>(null)
  const [persistentStorageGranted, setPersistentStorageGranted] = useState<boolean | null>(null)
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalling, setIsInstalling] = useState(false)
  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false
  )
  const fallbackSettingsSnapshot = useSyncExternalStore(
    subscribeToFallbackSettings,
    readFallbackSettingsSnapshot,
    () => null
  )
  const fallbackTileCachingEnabled =
    parseFallbackSettingsSnapshot(fallbackSettingsSnapshot)?.tileCachingEnabled ?? null
  const tileCachingEnabled = isHydrated
    ? (
        settings?.tileCachingEnabled ??
        fallbackTileCachingEnabled ??
        defaultAppSettings.tileCachingEnabled
      )
    : defaultAppSettings.tileCachingEnabled
  const hasStoredTiles = tileCacheCount !== null && tileCacheCount > 0
  const guidanceText = !isOnline
    ? hasStoredTiles
      ? `${tileCacheCount} Tiles liegen auf diesem Gerät und sind offline nutzbar.`
      : tileCachingEnabled
        ? 'Offline aktiv. Noch keine Tiles auf diesem Gerät. Bereich vorher online laden oder gezielt vorab sichern.'
        : 'Offline ohne Tile-Cache. Tile-Caching aktivieren und Kartenausschnitte vorab sichern.'
    : hasStoredTiles
      ? `${tileCacheCount} Tiles liegen auf diesem Gerät und sind offline nutzbar.`
      : installPromptEvent
        ? 'Für den Außeneinsatz die App installieren und Kartenausschnitte vorab sichern.'
        : tileCachingEnabled
          ? 'Tile-Cache ist aktiv. Neu geladene Kartentiles werden lokal auf dem Gerät gehalten.'
          : 'Für den Außeneinsatz Tile-Caching in den Einstellungen aktivieren.'

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine)
    update()

    window.addEventListener('online', update)
    window.addEventListener('offline', update)

    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function refreshTileCacheState() {
      const [count, persistent] = await Promise.all([
        getTileCacheCount(),
        getPersistentStorageStatus(),
      ])

      if (!cancelled) {
        setTileCacheCount(count)
        setPersistentStorageGranted(persistent)
      }
    }

    void refreshTileCacheState()

    const handleFocus = () => {
      void refreshTileCacheState()
    }

    const handleTileCacheChanged = () => {
      void refreshTileCacheState()
    }

    const handleWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TILE_CACHE_UPDATED') {
        void refreshTileCacheState()
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshTileCacheState()
      }
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener(TILE_CACHE_CHANGED_EVENT, handleTileCacheChanged)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    navigator.serviceWorker?.addEventListener('message', handleWorkerMessage)

    return () => {
      cancelled = true
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener(TILE_CACHE_CHANGED_EVENT, handleTileCacheChanged)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      navigator.serviceWorker?.removeEventListener('message', handleWorkerMessage)
    }
  }, [tileCachingEnabled])

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setInstallPromptEvent(event as BeforeInstallPromptEvent)
    }

    function clearInstallPrompt() {
      setInstallPromptEvent(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', clearInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', clearInstallPrompt)
    }
  }, [])

  async function handleInstallApp() {
    if (!installPromptEvent) return

    setIsInstalling(true)

    try {
      await installPromptEvent.prompt()
      await installPromptEvent.userChoice
      setInstallPromptEvent(null)
    } finally {
      setIsInstalling(false)
    }
  }

  return (
    <div className="border-b border-chrome-border bg-chrome-status text-white app-chrome-status">
      <div
        aria-label="App-Status"
        className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-3 py-2 text-xs [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
      >
        <span className={chromeBadgeClass(isOnline)}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
        <span className={chromeBadgeClass(hasStoredTiles)}>
          {tileCacheCount === null
            ? 'Karten prüfen'
            : hasStoredTiles
              ? 'Offline bereit'
              : 'Keine Offline-Karten'}
        </span>
        <span className={chromeBadgeClass(tileCachingEnabled)}>
          {tileCachingEnabled ? 'Cache an' : 'Cache aus'}
        </span>
        {persistentStorageGranted ? (
          <span className={chromeBadgeClass(true)}>Speicher fix</span>
        ) : null}
        {installPromptEvent ? (
          <button
            type="button"
            onClick={() => void handleInstallApp()}
            disabled={isInstalling}
            className="shrink-0 rounded-full border px-3 py-1.5 font-semibold app-chrome-control disabled:opacity-50"
          >
            {isInstalling ? 'Installiert ...' : 'Installieren'}
          </button>
        ) : null}
      </div>

      <div className="mx-auto hidden max-w-6xl flex-wrap items-center gap-2 px-4 py-2.5 text-sm md:flex xl:max-w-[88rem]">
        <span className={chromeBadgeClass(isOnline)}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
        <span className={chromeBadgeClass(tileCachingEnabled)}>
          {tileCachingEnabled
            ? 'Tile-Cache aktiv'
            : 'Tile-Cache aus'}
        </span>
        <span className={chromeBadgeClass(hasStoredTiles)}>
          {tileCacheCount === null
            ? 'Tiles werden geprüft'
            : hasStoredTiles
              ? `${tileCacheCount} Tiles auf Gerät`
              : 'Keine Tiles auf Gerät'}
        </span>
        <span className={chromeBadgeClass(hasStoredTiles)}>
          {hasStoredTiles ? 'Offline nutzbar' : 'Offline nicht vorbereitet'}
        </span>
        {persistentStorageGranted !== null ? (
          <span className={chromeBadgeClass(persistentStorageGranted)}>
            {persistentStorageGranted ? 'Persistenter Speicher aktiv' : 'Speicher nicht zugesichert'}
          </span>
        ) : null}
        {installPromptEvent ? (
          <button
            type="button"
            onClick={() => void handleInstallApp()}
            disabled={isInstalling}
            className="rounded-full border px-3 py-1.5 font-semibold app-chrome-control disabled:opacity-50"
          >
            {isInstalling ? 'Installiert ...' : 'App installieren'}
          </button>
        ) : null}
        <span className="w-full text-sm font-semibold text-chrome-foreground sm:w-auto sm:flex-1">
          {guidanceText}
        </span>
      </div>
    </div>
  )
}
