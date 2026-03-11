'use client'

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
  const storageBadgeClass = [
    'rounded-full border px-3 py-1 text-xs font-semibold shadow-sm',
    hasStoredTiles
      ? 'border-emerald-700 bg-emerald-100 text-emerald-950'
      : 'border-[#ccb98a] bg-[#fffdf6] text-neutral-800',
  ].join(' ')
  const persistenceBadgeClass = [
    'rounded-full border px-3 py-1 text-xs font-semibold shadow-sm',
    persistentStorageGranted
      ? 'border-emerald-700 bg-emerald-100 text-emerald-950'
      : 'border-[#ccb98a] bg-[#fffdf6] text-neutral-800',
  ].join(' ')

  return (
    <div className="rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-4">
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={isOpen}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div>
          <div className="text-sm font-medium text-neutral-900">Tile-Cache</div>
          <div className="mt-1 text-sm font-medium text-neutral-800">
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
          <div className="mt-2 text-xs font-medium text-neutral-700">
            Speichermodus: {settingsStorageMode === 'db' ? 'App-Datenbank' : 'iOS-Fallback'}
          </div>
          <div className="mt-1 text-xs font-medium text-neutral-700">
            Persistenter Speicher:{' '}
            {persistentStorageGranted === null
              ? 'unbekannt'
              : persistentStorageGranted
                ? 'aktiv'
                : 'nicht zugesichert'}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="rounded-full border border-[#ccb98a] bg-[#fffdf6] px-3 py-1 text-xs font-semibold text-neutral-700">
            {tileCacheLoading
              ? 'prüft ...'
              : tileCacheCount === null
                ? 'unbekannt'
                : `${tileCacheCount} Tiles`}
          </div>
          <div className="mt-1 text-base text-neutral-900">{isOpen ? '−' : '+'}</div>
        </div>
      </button>

      {isOpen ? (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onEnablePersistentStorage()}
              disabled={persistentStorageLoading}
              className="rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-neutral-900 disabled:opacity-50"
            >
              {persistentStorageLoading ? 'Fragt an ...' : 'Persistenten Speicher anfragen'}
            </button>
            <button
              type="button"
              onClick={() => void onClearTileCache()}
              disabled={!tileCacheSupported || tileCacheClearing}
              className="rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-neutral-900 disabled:opacity-50"
            >
              {tileCacheClearing ? 'Leert ...' : 'Cache leeren'}
            </button>
          </div>
          <p className="mt-2 text-xs font-medium text-neutral-700">
            Die Anzeige ist eine grobe Anzahl lokal gespeicherter Kartentiles.
          </p>
        </>
      ) : null}
    </div>
  )
}
