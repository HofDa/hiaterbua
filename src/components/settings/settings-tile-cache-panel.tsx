'use client'

import { Card, CardContent } from '@/components/ui/card'
import { FormButton } from '@/components/ui/form'
import { Alert } from '@/components/ui/alert'
import { cn } from '@/lib/utils/cn'
import type { SettingsStorageMode } from '@/components/settings/settings-options'

export type SettingsTileCachePanelProps = {
  tileCachingEnabled: boolean
  tileCacheSupported: boolean
  tileCacheLoading: boolean
  tileCacheClearing: boolean
  tileCacheCount: number | null
  hasStoredTiles: boolean
  isOpen: boolean
  settingsStorageMode: SettingsStorageMode
  persistentStorageGranted: boolean | null
  persistentStorageLoading: boolean
  onToggleOpen: () => void
  onEnablePersistentStorage: () => void | Promise<void>
  onClearTileCache: () => void | Promise<void>
}

export function SettingsTileCachePanel({
  tileCachingEnabled,
  tileCacheSupported,
  tileCacheLoading,
  tileCacheClearing,
  tileCacheCount,
  hasStoredTiles,
  isOpen,
  settingsStorageMode,
  persistentStorageGranted,
  persistentStorageLoading,
  onToggleOpen,
  onEnablePersistentStorage,
  onClearTileCache,
}: SettingsTileCachePanelProps) {
  const storageBadgeClass = cn(
    'rounded-full border px-3 py-1 text-xs font-semibold shadow-sm',
    hasStoredTiles
      ? 'border-success-border bg-success-surface text-success-ink'
      : 'border-border bg-surface-raised text-ink-soft',
  )
  const persistenceBadgeClass = cn(
    'rounded-full border px-3 py-1 text-xs font-semibold shadow-sm',
    persistentStorageGranted
      ? 'border-success-border bg-success-surface text-success-ink'
      : 'border-border bg-surface-raised text-ink-soft',
  )

  return (
    <Card className="border-border bg-surface-raised p-4">
      <CardContent className="p-0">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={isOpen}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <div>
            <div className="text-sm font-medium text-ink">Tile-Cache</div>
            <div className="mt-1 text-sm font-medium text-ink-soft">
              {tileCacheSupported
                ? hasStoredTiles
                  ? `${tileCacheCount} Tiles liegen auf diesem Gerät und sind offline nutzbar.`
                  : tileCachingEnabled
                    ? 'Tile-Caching ist aktiv. Neu geladene Tiles werden lokal auf dem Gerät gespeichert.'
                    : 'Caching ist ausgeschaltet. Bereits geladene Tiles können geleert werden.'
                : 'Dieser Browser stellt die Cache-API nicht bereit.'}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={storageBadgeClass}>
                {tileCacheLoading
                  ? 'Tiles werden geprüft'
                  : hasStoredTiles
                    ? `${tileCacheCount} Tiles auf Gerät`
                    : 'Keine Tiles auf Gerät'}
              </span>
              <span className={storageBadgeClass}>
                {hasStoredTiles ? 'Offline nutzbar' : 'Offline noch nicht vorbereitet'}
              </span>
              <span className={persistenceBadgeClass}>
                {persistentStorageGranted === null
                  ? 'Persistenz unbekannt'
                  : persistentStorageGranted
                    ? 'Persistenter Speicher aktiv'
                    : 'Speicher nicht zugesichert'}
              </span>
            </div>
            <div className="mt-2 text-xs font-medium text-ink-muted">
              Speichermodus: {settingsStorageMode === 'db' ? 'App-Datenbank' : 'iOS-Fallback'}
            </div>
            <div className="mt-1 text-xs font-medium text-ink-muted">
              Persistenter Speicher:{' '}
              {persistentStorageGranted === null
                ? 'unbekannt'
                : persistentStorageGranted
                  ? 'aktiv'
                  : 'nicht zugesichert'}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="rounded-full border border-border bg-surface-raised px-3 py-1 text-xs font-semibold text-ink-muted">
              {tileCacheLoading
                ? 'prüft ...'
                : tileCacheCount === null
                  ? 'unbekannt'
                  : `${tileCacheCount} Tiles`}
            </div>
            <div className="mt-1 text-base text-ink">{isOpen ? '−' : '+'}</div>
          </div>
        </button>

        {isOpen ? (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              <FormButton
                onClick={() => void onEnablePersistentStorage()}
                disabled={persistentStorageLoading}
                variant="secondary"
                className="py-3 text-sm"
              >
                {persistentStorageLoading ? 'Fragt an ...' : 'Persistenten Speicher anfragen'}
              </FormButton>
              <FormButton
                onClick={() => void onClearTileCache()}
                disabled={!tileCacheSupported || tileCacheClearing}
                variant="secondary"
                className="py-3 text-sm"
              >
                {tileCacheClearing ? 'Leert ...' : 'Cache leeren'}
              </FormButton>
            </div>
            <Alert variant="info" className="mt-2 text-xs">
              Die Anzeige ist eine grobe Anzahl lokal gespeicherter Kartentiles.
            </Alert>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
