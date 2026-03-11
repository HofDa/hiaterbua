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
    <div className="border-b border-[#061a14] bg-[linear-gradient(180deg,#174634,#113126)] text-white shadow-[0_12px_28px_rgba(8,23,17,0.28)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2.5 text-sm xl:max-w-[88rem]">
        <span
          className={[
            'rounded-full border px-3 py-1.5 font-semibold shadow-sm',
            isOnline
              ? 'border-white bg-[#2f6b4d] text-white'
              : 'border-[#0a2018] bg-[#fffdf8] text-[#111111]',
          ].join(' ')}
        >
          {isOnline ? 'Online' : 'Offline'}
        </span>
        <span
          className={[
            'rounded-full border px-3 py-1.5 font-semibold shadow-sm',
            tileCachingEnabled
              ? 'border-white bg-[#2f6b4d] text-white'
              : 'border-[#0a2018] bg-[#fffdf8] text-[#111111]',
          ].join(' ')}
        >
          {tileCachingEnabled
            ? 'Tile-Cache aktiv'
            : 'Tile-Cache aus'}
        </span>
        <span
          className={[
            'rounded-full border px-3 py-1.5 font-semibold shadow-sm',
            hasStoredTiles
              ? 'border-white bg-[#2f6b4d] text-white'
              : 'border-[#0a2018] bg-[#fffdf8] text-[#111111]',
          ].join(' ')}
        >
          {tileCacheCount === null
            ? 'Tiles werden geprüft'
            : hasStoredTiles
              ? `${tileCacheCount} Tiles auf Gerät`
              : 'Keine Tiles auf Gerät'}
        </span>
        <span
          className={[
            'rounded-full border px-3 py-1.5 font-semibold shadow-sm',
            hasStoredTiles
              ? 'border-white bg-[#2f6b4d] text-white'
              : 'border-[#0a2018] bg-[#fffdf8] text-[#111111]',
          ].join(' ')}
        >
          {hasStoredTiles ? 'Offline nutzbar' : 'Offline nicht vorbereitet'}
        </span>
        {persistentStorageGranted !== null ? (
          <span
            className={[
              'rounded-full border px-3 py-1.5 font-semibold shadow-sm',
              persistentStorageGranted
                ? 'border-white bg-[#2f6b4d] text-white'
                : 'border-[#0a2018] bg-[#fffdf8] text-[#111111]',
            ].join(' ')}
          >
            {persistentStorageGranted ? 'Persistenter Speicher aktiv' : 'Speicher nicht zugesichert'}
          </span>
        ) : null}
        {installPromptEvent ? (
          <button
            type="button"
            onClick={() => void handleInstallApp()}
            disabled={isInstalling}
            className="rounded-full border border-[#0a2018] bg-[#fffdf8] px-3 py-1.5 font-semibold text-[#111111] shadow-sm disabled:opacity-50"
          >
            {isInstalling ? 'Installiert ...' : 'App installieren'}
          </button>
        ) : null}
        <span className="w-full text-sm font-semibold text-[#f3f8f4] sm:w-auto sm:flex-1">
          {guidanceText}
        </span>
      </div>
    </div>
  )
}
