'use client'

import { Card, CardContent } from '@/components/ui/card'
import { FormButton } from '@/components/ui/form'
import { Alert } from '@/components/ui/alert'
import { formatDecimal } from '@/lib/utils/format'
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
  return (
    <Card className="border-border bg-surface-raised p-4">
      <CardContent className="p-0">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={isOpen}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          {/* One status line instead of three look-alike chips and a counter
              squeezed into a narrow column. */}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-ink">Gesicherte Karten</div>
            <div className="mt-1 text-sm font-medium text-ink-soft">
              {!tileCacheSupported
                ? 'Dieser Browser kann keine Karten offline sichern.'
                : tileCacheLoading
                  ? 'Wird geprüft …'
                  : hasStoredTiles
                    ? `${formatDecimal(tileCacheCount ?? 0)} Kartenausschnitte gesichert – offline nutzbar`
                    : tileCachingEnabled
                      ? 'Noch keine Karte gesichert. Angesehene Karten werden ab jetzt gesichert.'
                      : 'Noch keine Karte gesichert.'}
              {persistentStorageGranted === false && hasStoredTiles
                ? ' · Gerät darf sie bei Platzmangel löschen'
                : persistentStorageGranted
                  ? ' · vor Löschen geschützt'
                  : ''}
            </div>
          </div>
          <div className="shrink-0 pt-0.5">
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
