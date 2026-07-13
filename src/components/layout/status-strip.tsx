'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { db } from '@/lib/db/dexie'
import { getTileCacheCount, TILE_CACHE_CHANGED_EVENT } from '@/lib/maps/tile-cache'
import { getOfflineMapReadinessProblem } from '@/lib/maps/offline-map-readiness'
import { defaultAppSettings } from '@/lib/settings/defaults'
import {
  parseFallbackSettingsSnapshot,
  readFallbackSettingsSnapshot,
  subscribeToFallbackSettings,
} from '@/lib/settings/page-helpers'
import { cn } from '@/lib/utils/cn'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function subscribeToHydration() {
  return () => {}
}

// The strip stays invisible while the app is field-ready. It only surfaces the
// two preparedness problems the shepherd must fix before losing signal (no
// offline maps, tile cache disabled) plus the one-time install prompt; plain
// "offline" status is covered by the ConnectivityBanner.
export function StatusStrip() {
  const [isOnline, setIsOnline] = useState(true)
  const [tileCacheCount, setTileCacheCount] = useState<number | null>(null)
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
      const count = await getTileCacheCount()

      if (!cancelled) {
        setTileCacheCount(count)
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

  const problem = getOfflineMapReadinessProblem({
    tileCachingEnabled,
    isOnline,
    tileCacheCount,
  })

  if (!problem && !installPromptEvent) return null

  return (
    <div className="border-b border-chrome-border bg-chrome-status text-white app-chrome-status">
      <div
        role="status"
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 text-xs md:px-4 md:text-sm xl:max-w-[88rem]"
      >
        {problem ? (
          <span className="flex min-w-0 flex-1 items-center gap-2 font-semibold">
            <AlertTriangle
              aria-hidden="true"
              className={cn(
                'h-4 w-4 shrink-0',
                problem.tone === 'error' ? 'text-error-border' : 'text-warning-border',
              )}
            />
            <span className="min-w-0">{problem.text}</span>
            {problem.action ? (
              <Link
                href={problem.action.href}
                className="shrink-0 rounded-full border px-3 py-1 font-semibold app-chrome-control"
              >
                {problem.action.label}
              </Link>
            ) : null}
          </span>
        ) : null}
        {installPromptEvent ? (
          <button
            type="button"
            onClick={() => void handleInstallApp()}
            disabled={isInstalling}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 font-semibold app-chrome-control disabled:opacity-50',
              !problem && 'ml-auto',
            )}
          >
            {isInstalling ? 'Installiert ...' : 'App installieren'}
          </button>
        ) : null}
      </div>
    </div>
  )
}
