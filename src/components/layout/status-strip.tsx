'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { getAppSettings } from '@/lib/db/repositories/settings'
import { useSecureAreaPrefetch } from '@/components/dashboard/use-secure-area-prefetch'
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

const SNOOZE_KEY_PREFIX = 'pastore:status-strip-snoozed:'
const SNOOZE_MS = 24 * 60 * 60 * 1000

function readSnoozedUntil(problemText: string) {
  try {
    return Number(window.localStorage.getItem(`${SNOOZE_KEY_PREFIX}${problemText}`) ?? 0)
  } catch {
    return 0
  }
}

function writeSnoozedUntil(problemText: string, until: number) {
  try {
    window.localStorage.setItem(`${SNOOZE_KEY_PREFIX}${problemText}`, String(until))
  } catch {
    // Storage blocked: the snooze holds for this page view only.
  }
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
  // Bumped on snooze so the strip re-reads the stored snooze immediately.
  const [snoozeVersion, setSnoozeVersion] = useState(0)
  const pathname = usePathname()
  const settings = useLiveQuery(() => getAppSettings(), [])
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
  // The banner's button does the whole job — switch offline maps on and save
  // the area around the user — instead of sending them to Einstellungen.
  const secureArea = useSecureAreaPrefetch({
    baseLayer: settings?.mapBaseLayer ?? defaultAppSettings.mapBaseLayer,
    tileCachingEnabled,
  })
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

  // A warning can be put away for a day — it took ~100px of every screen.
  // An error (offline with no maps) cannot be snoozed.
  const isSnoozed =
    isHydrated &&
    snoozeVersion >= 0 &&
    problem?.tone === 'warning' &&
    readSnoozedUntil(problem.text) > Date.now()
  // Map-readiness only matters where maps are used. On Start the "Karte
  // offline sichern" card already carries the warning; on Herden, Sichern or
  // Einstellungen a standing banner only teaches people to ignore banners.
  const isMapScreen =
    pathname?.startsWith('/sessions') || pathname?.startsWith('/enclosures')
  const isRelevantHere =
    problem?.tone === 'error' ? isMapScreen || pathname === '/' : isMapScreen
  const visibleProblem = isSnoozed || !isRelevantHere ? null : problem

  function snoozeProblem() {
    if (!problem) return
    writeSnoozedUntil(problem.text, Date.now() + SNOOZE_MS)
    setSnoozeVersion((current) => current + 1)
  }

  if (!visibleProblem && !installPromptEvent) return null

  return (
    <div className="border-b border-chrome-border bg-chrome-status text-white app-chrome-status">
      <div
        role="status"
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 text-xs md:px-4 md:text-sm xl:max-w-[88rem]"
      >
        {visibleProblem ? (
          <span className="flex min-w-0 flex-1 items-center gap-2 font-semibold">
            <AlertTriangle
              aria-hidden="true"
              className={cn(
                'h-4 w-4 shrink-0',
                visibleProblem.tone === 'error' ? 'text-error-border' : 'text-warning-border',
              )}
            />
            <span className="min-w-0" aria-live="polite">
              {secureArea.isBusy || secureArea.status === 'error'
                ? secureArea.progress
                  ? `Sichert Karte … ${secureArea.progress.completed} / ${secureArea.progress.total}`
                  : secureArea.message
                : visibleProblem.text}
            </span>
            {visibleProblem.action ? (
              <button
                type="button"
                onClick={() => secureArea.secureCurrentArea()}
                disabled={secureArea.isBusy}
                className="inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 font-semibold app-chrome-control disabled:opacity-60"
              >
                {secureArea.isBusy ? 'Sichert …' : visibleProblem.action.label}
              </button>
            ) : null}
            {visibleProblem.tone === 'warning' ? (
              <button
                type="button"
                onClick={snoozeProblem}
                aria-label="Hinweis für 24 Stunden ausblenden"
                className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-chrome-muted transition-colors hover:text-white"
              >
                <X aria-hidden="true" className="h-5 w-5" strokeWidth={2.4} />
              </button>
            ) : null}
          </span>
        ) : null}
        {installPromptEvent ? (
          <button
            type="button"
            onClick={() => void handleInstallApp()}
            disabled={isInstalling}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 font-semibold app-chrome-control disabled:opacity-50',
              !visibleProblem && 'ml-auto',
            )}
          >
            {isInstalling ? 'Installiert ...' : 'App installieren'}
          </button>
        ) : null}
      </div>
    </div>
  )
}
