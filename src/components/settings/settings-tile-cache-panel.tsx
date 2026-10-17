'use client'

import { Card, CardContent } from '@/components/ui/card'
import { FormButton } from '@/components/ui/form'
import { Alert } from '@/components/ui/alert'
import { cn } from '@/lib/utils/cn'
import type { SettingsStorageMode } from '@/components/settings/settings-options'
import { ChevronDown } from 'lucide-react'

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
            <div className="text-sm font-semibold text-ink">Offline-Karten</div>
            <div className="mt-1 text-sm font-medium text-ink-soft">
              {tileCacheSupported
                ? hasStoredTiles
                  ? `${tileCacheCount} Kartenausschnitte liegen auf diesem Gerät und sind offline nutzbar.`
                  : tileCachingEnabled
                    ? 'Eingeschaltet: Angesehene Kartenausschnitte werden auf dem Gerät gespeichert und sind ohne Netz verfügbar.'
                    : 'Ausgeschaltet: Neue Kartenausschnitte werden nicht gespeichert. Bereits gespeicherte können gelöscht werden.'
                : 'Dieser Browser stellt die Cache-API nicht bereit.'}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={storageBadgeClass}>
                {tileCacheLoading
                  ? 'Wird geprüft …'
                  : hasStoredTiles
                    ? `${tileCacheCount} Kartenausschnitte gespeichert`
                    : 'Noch keine Karte gespeichert'}
              </span>
              <span className={storageBadgeClass}>
                {hasStoredTiles ? 'Offline nutzbar' : 'Offline noch nicht vorbereitet'}
              </span>
              <span className={persistenceBadgeClass}>
                {persistentStorageGranted === null
                  ? 'Schutz unbekannt'
                  : persistentStorageGranted
                    ? 'Vor Löschen geschützt'
                    : 'Nicht vor Löschen geschützt'}
              </span>
            </div>
            <div className="mt-1 text-xs font-medium text-ink-muted">
              Das Gerät darf die gespeicherten Daten bei Platzmangel{' '}
              {persistentStorageGranted === null
                ? 'vielleicht löschen'
                : persistentStorageGranted
                  ? 'nicht löschen'
                  : 'löschen – bitte Schutz anfragen'}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="rounded-full border border-border bg-surface-raised px-3 py-1 text-xs font-semibold text-ink-muted">
              {tileCacheLoading
                ? 'prüft ...'
                : tileCacheCount === null
                  ? 'unbekannt'
                  : `${tileCacheCount} Ausschnitte`}
            </div>
            <ChevronDown
              aria-hidden="true"
              className={isOpen ? 'ml-auto mt-1 h-5 w-5 rotate-180 text-ink transition-transform' : 'ml-auto mt-1 h-5 w-5 text-ink transition-transform'}
            />
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
                {persistentStorageLoading ? 'Fragt an …' : 'Vor Löschen schützen'}
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
              Die Anzeige ist eine grobe Anzahl lokal gespeicherter Kartenausschnitte.
            </Alert>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
