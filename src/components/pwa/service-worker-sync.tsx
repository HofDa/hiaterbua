'use client'

import { Download, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/dexie'
import { requestPersistentStorage } from '@/lib/maps/tile-cache'
import {
  parseFallbackSettingsSnapshot,
  readFallbackSettingsSnapshot,
  subscribeToFallbackSettings,
} from '@/lib/settings/page-helpers'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { logError } from '@/lib/utils/log'

type BackupStatus = 'idle' | 'exporting' | 'exported' | 'error'

function postTileCachingMessage(
  worker: ServiceWorker | null | undefined,
  tileCachingEnabled: boolean | null,
  clearStoredTiles: boolean,
) {
  if (!worker || tileCachingEnabled === null) {
    return false
  }

  worker.postMessage({
    type: 'SET_TILE_CACHING',
    enabled: tileCachingEnabled,
    clearStoredTiles,
  })

  return true
}

type ServiceWorkerUpdatePromptProps = {
  isApplyingUpdate: boolean
  onApplyUpdate: () => void
  waitingWorker: ServiceWorker | null
}

function ServiceWorkerUpdatePrompt({
  isApplyingUpdate,
  onApplyUpdate,
  waitingWorker,
}: ServiceWorkerUpdatePromptProps) {
  const [backupStatus, setBackupStatus] = useState<BackupStatus>('idle')
  const [backupError, setBackupError] = useState<string | null>(null)

  const isExportingBackup = backupStatus === 'exporting'
  const helperText =
    backupStatus === 'exported'
      ? 'Backup exportiert. Du kannst die neue Version jetzt starten.'
      : backupStatus === 'error'
        ? backupError ?? 'Backup konnte nicht erstellt werden.'
        : 'Deine lokalen Daten bleiben gespeichert. Ein Backup vor dem Update wird empfohlen.'

  const handleBackupExport = useCallback(async () => {
    if (isExportingBackup) {
      return
    }

    setBackupStatus('exporting')
    setBackupError(null)

    try {
      const [{ buildAppExportArchive }, { downloadBlob }, { recordDataBackup }] =
        await Promise.all([
          import('@/lib/import-export/export-page-helpers'),
          import('@/lib/import-export/file-formats'),
          import('@/lib/settings/backup-reminder'),
        ])
      const { blob, filename } = await buildAppExportArchive()

      downloadBlob(blob, filename)
      await recordDataBackup()
      setBackupStatus('exported')
    } catch (error) {
      logError('ServiceWorkerUpdatePrompt.handleBackupExport', error)
      setBackupStatus('error')
      setBackupError('Backup konnte nicht erstellt werden. Bitte erneut versuchen.')
    }
  }, [isExportingBackup])

  if (!waitingWorker) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(var(--app-bottom-nav-height)+var(--app-recording-bar-height)+env(safe-area-inset-bottom)+0.75rem)] z-50 mx-auto max-w-xl md:bottom-[calc(var(--app-recording-bar-height)+1rem)]">
      <section
        aria-labelledby="pwa-update-title"
        className="pointer-events-auto rounded-[1.1rem] border-2 border-border-ink bg-surface p-4 text-ink-strong shadow-[0_18px_42px_rgba(40,34,26,0.18)]"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 id="pwa-update-title" className="text-sm font-semibold">
              Neue Version verfügbar
            </h2>
            <p
              className={cn(
                'mt-1 text-sm font-medium text-ink-muted',
                backupStatus === 'error' && 'text-error-ink',
                backupStatus === 'exported' && 'text-success-ink',
              )}
            >
              {helperText}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
            <button
              type="button"
              onClick={() => void handleBackupExport()}
              disabled={isExportingBackup || isApplyingUpdate}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'h-10 gap-2 border-border-strong bg-surface-raised px-3 text-ink-strong',
              )}
            >
              <Download aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>{isExportingBackup ? 'Export...' : 'Backup'}</span>
            </button>

            <button
              type="button"
              onClick={onApplyUpdate}
              disabled={isExportingBackup || isApplyingUpdate}
              className={cn(
                buttonVariants({ variant: 'default', size: 'sm' }),
                'h-10 gap-2 px-3',
              )}
            >
              <RefreshCw
                aria-hidden="true"
                className={cn('h-4 w-4 shrink-0', isApplyingUpdate && 'animate-spin')}
              />
              <span>{isApplyingUpdate ? 'Start...' : 'Aktualisieren'}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export function ServiceWorkerSync() {
  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const previousTileCachingEnabled = useRef<boolean | null>(null)
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const isUpdateActivationRequested = useRef(false)
  const didReloadForUpdate = useRef(false)
  const tileCachingEnabledRef = useRef<boolean | null>(null)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false)
  const fallbackSettingsSnapshot = useSyncExternalStore(
    subscribeToFallbackSettings,
    readFallbackSettingsSnapshot,
    () => null
  )
  const fallbackTileCachingEnabled =
    parseFallbackSettingsSnapshot(fallbackSettingsSnapshot)?.tileCachingEnabled ?? null
  const tileCachingEnabled =
    settings?.tileCachingEnabled ?? fallbackTileCachingEnabled ?? null

  useEffect(() => {
    tileCachingEnabledRef.current = tileCachingEnabled
  }, [tileCachingEnabled])

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    let isCancelled = false

    async function registerServiceWorker() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none',
        })
        if (isCancelled) return

        registrationRef.current = registration

        const handleWaitingWorker = (worker: ServiceWorker | null | undefined) => {
          if (isCancelled || !worker || !navigator.serviceWorker.controller) {
            return
          }

          setWaitingWorker(worker)
        }

        const trackInstallingWorker = () => {
          const installingWorker = registration.installing
          if (!installingWorker) {
            return
          }

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              handleWaitingWorker(registration.waiting ?? installingWorker)
            }
          })
        }

        registration.addEventListener('updatefound', trackInstallingWorker)
        trackInstallingWorker()
        handleWaitingWorker(registration.waiting)

        const currentTileCachingEnabled = tileCachingEnabledRef.current
        const worker =
          registration.active ??
          navigator.serviceWorker.controller ??
          registration.waiting ??
          registration.installing

        if (
          postTileCachingMessage(
            worker,
            currentTileCachingEnabled,
            previousTileCachingEnabled.current === true && currentTileCachingEnabled === false,
          )
        ) {
          previousTileCachingEnabled.current = currentTileCachingEnabled
        }

        void registration.update().catch(() => undefined)
      } catch {
        // Service worker registration is optional for the app to function.
      }
    }

    void registerServiceWorker()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const registration = registrationRef.current
    const worker =
      navigator.serviceWorker.controller ??
      registration?.active ??
      registration?.waiting ??
      registration?.installing

    if (
      postTileCachingMessage(
        worker,
        tileCachingEnabled,
        previousTileCachingEnabled.current === true && tileCachingEnabled === false,
      )
    ) {
      previousTileCachingEnabled.current = tileCachingEnabled
    }
  }, [tileCachingEnabled])

  useEffect(() => {
    if (!navigator.serviceWorker) return

    function handleControllerChange() {
      if (isUpdateActivationRequested.current && !didReloadForUpdate.current) {
        didReloadForUpdate.current = true
        window.location.reload()
        return
      }

      if (tileCachingEnabled === null) {
        return
      }

      if (
        postTileCachingMessage(
          navigator.serviceWorker.controller,
          tileCachingEnabled,
          previousTileCachingEnabled.current === true && tileCachingEnabled === false,
        )
      ) {
        previousTileCachingEnabled.current = tileCachingEnabled
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    handleControllerChange()

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [tileCachingEnabled])

  useEffect(() => {
    // Persisted storage protects the user's primary field data (sessions,
    // trackpoints, herds) from eviction under storage pressure — not just
    // cached tiles — so request it unconditionally on startup.
    void requestPersistentStorage()
  }, [])

  const applyWaitingUpdate = useCallback(() => {
    if (!waitingWorker || isApplyingUpdate) {
      return
    }

    isUpdateActivationRequested.current = true
    setIsApplyingUpdate(true)

    try {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    } catch (error) {
      logError('ServiceWorkerSync.applyWaitingUpdate', error)
      isUpdateActivationRequested.current = false
      setIsApplyingUpdate(false)
    }
  }, [isApplyingUpdate, waitingWorker])

  return (
    <ServiceWorkerUpdatePrompt
      isApplyingUpdate={isApplyingUpdate}
      onApplyUpdate={applyWaitingUpdate}
      waitingWorker={waitingWorker}
    />
  )
}
