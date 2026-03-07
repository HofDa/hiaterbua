'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '@/lib/db/dexie'
import { getTileCacheCount } from '@/lib/maps/tile-cache'
import { defaultAppSettings } from '@/lib/settings/defaults'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function StatusStrip() {
  const [isOnline, setIsOnline] = useState(true)
  const [tileCacheCount, setTileCacheCount] = useState<number | null>(null)
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalling, setIsInstalling] = useState(false)
  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const effectiveSettings = settings ?? defaultAppSettings
  const guidanceText = !isOnline
    ? effectiveSettings.tileCachingEnabled
      ? 'Offline aktiv. Bereits gesicherte Kartenausschnitte bleiben verfügbar.'
      : 'Offline ohne aktiven Tile-Cache. Kartenbereiche vorher sichern.'
    : installPromptEvent
      ? 'Für den Außeneinsatz die App installieren und Kartenausschnitte vorab sichern.'
      : effectiveSettings.tileCachingEnabled
        ? 'Tile-Cache ist aktiv. Ausschnitte können direkt in der Karte offline gesichert werden.'
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

    async function loadTileCacheCount() {
      const count = await getTileCacheCount()
      if (!cancelled) {
        setTileCacheCount(count)
      }
    }

    void loadTileCacheCount()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadTileCacheCount()
      }
    }

    window.addEventListener('focus', loadTileCacheCount)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      window.removeEventListener('focus', loadTileCacheCount)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [effectiveSettings.tileCachingEnabled])

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
    <div className="border-b border-white/45 bg-[rgba(255,252,246,0.55)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2 text-sm">
        <span
          className={[
            'rounded-full px-3 py-1 font-medium',
            isOnline
              ? 'bg-emerald-100 text-emerald-950'
              : 'bg-amber-100 text-amber-950',
          ].join(' ')}
        >
          {isOnline ? 'Online' : 'Offline'}
        </span>
        <span
          className={[
            'rounded-full px-3 py-1 font-medium',
            effectiveSettings.tileCachingEnabled
              ? 'bg-cyan-100 text-cyan-950'
              : 'bg-stone-200 text-stone-900',
          ].join(' ')}
        >
          {effectiveSettings.tileCachingEnabled
            ? `Tile-Cache aktiv${tileCacheCount !== null ? ` · ${tileCacheCount} Tiles` : ''}`
            : 'Tile-Cache aus'}
        </span>
        {installPromptEvent ? (
          <button
            type="button"
            onClick={() => void handleInstallApp()}
            disabled={isInstalling}
            className="rounded-full bg-neutral-950 px-3 py-1 font-medium text-white disabled:opacity-50"
          >
            {isInstalling ? 'Installiert ...' : 'App installieren'}
          </button>
        ) : null}
        <span className="w-full text-xs font-medium text-neutral-700 sm:w-auto sm:flex-1">
          {guidanceText}
        </span>
      </div>
    </div>
  )
}
