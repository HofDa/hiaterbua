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
    <div className="border-b border-[#061a14] bg-[linear-gradient(180deg,#174634,#113126)] text-white shadow-[0_12px_28px_rgba(8,23,17,0.28)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
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
            effectiveSettings.tileCachingEnabled
              ? 'border-white bg-[#2f6b4d] text-white'
              : 'border-[#0a2018] bg-[#fffdf8] text-[#111111]',
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
