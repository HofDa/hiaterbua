'use client'

import type { Dispatch, FormEventHandler, SetStateAction } from 'react'
import { ChevronDown } from 'lucide-react'
import { settingsMapOptions } from '@/components/settings/settings-options'
import {
  SettingsTileCachePanel,
  type SettingsTileCachePanelProps,
} from '@/components/settings/settings-tile-cache-panel'
import type { AppSettings, KeepScreenAwakeMode, MapBaseLayer } from '@/types/domain'
import type { BrowserNotificationPermissionState } from '@/lib/notifications/browser-notifications'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField, FormLabel, FormSelect, FormInput, FormButton } from '@/components/ui/form'
import { StatusAlert } from '@/components/ui/alert'
import { gpsPresets, getGpsTuning, matchGpsPreset } from '@/lib/settings/gps-presets'
import { cn } from '@/lib/utils/cn'
import { idleChoiceClassName, selectedChoiceClassName } from '@/components/ui/mobile-flow'

type SettingsGeneralFormCardProps = {
  draft: AppSettings
  setDraft: Dispatch<SetStateAction<AppSettings>>
  status: string
  saving: boolean
  onSubmit: FormEventHandler<HTMLFormElement>
  onResetSettings: () => void
  browserNotificationPermission: BrowserNotificationPermissionState
  onRequestBrowserNotifications: () => void
  tileCachePanel: SettingsTileCachePanelProps
}

function getBrowserNotificationStatusText(permission: BrowserNotificationPermissionState) {
  if (permission === 'granted') {
    return 'Aktiv: Erinnerungen können zusätzlich als Browser-Benachrichtigung erscheinen.'
  }

  if (permission === 'denied') {
    return 'Blockiert: Erinnerungen erscheinen weiter in der App. Browser-Benachrichtigungen kannst du in den Website-Einstellungen erlauben.'
  }

  if (permission === 'unsupported') {
    return 'Nicht verfügbar: Erinnerungen erscheinen weiter in der App.'
  }

  return 'Nicht aktiv: Erinnerungen erscheinen in der App. Browser-Benachrichtigungen kannst du hier bewusst aktivieren.'
}

export function SettingsGeneralFormCard({
  draft,
  setDraft,
  status,
  saving,
  onSubmit,
  onResetSettings,
  browserNotificationPermission,
  onRequestBrowserNotifications,
  tileCachePanel,
}: SettingsGeneralFormCardProps) {
  const activePreset = matchGpsPreset(draft)
  const activePresetDescription = gpsPresets.find((preset) => preset.id === activePreset)?.description
  const canRequestBrowserNotifications = browserNotificationPermission === 'default'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Karte, GPS und Anzeige</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <FormField>
            <FormLabel>Kartengrundlage</FormLabel>
            <FormSelect
              value={draft.mapBaseLayer}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  mapBaseLayer: event.target.value as MapBaseLayer,
                }))
              }
            >
              {settingsMapOptions.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField>
            <FormLabel>GPS-Profil</FormLabel>
            <div className="flex flex-wrap gap-2">
              {gpsPresets.map((preset) => {
                const active = activePreset === preset.id

                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setDraft((current) => ({ ...current, ...getGpsTuning(preset) }))
                    }
                    className={cn(
                      'min-h-11 rounded-full px-4 py-2 text-sm transition-colors',
                      active ? selectedChoiceClassName : idleChoiceClassName,
                    )}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
            <p className="mt-1 text-xs font-medium text-ink-muted">
              {activePresetDescription ?? 'Eigene Werte – unten anpassbar.'}
            </p>
          </FormField>

          {/* Raw thresholds are for fine-tuning; the profile above covers the
              everyday choice. Each field says what it does in practice. */}
          <details className="group rounded-[1.1rem] border border-border-soft px-4 py-2">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink-strong [&::-webkit-details-marker]:hidden">
              GPS-Feinabstimmung
              <ChevronDown aria-hidden="true" className="h-5 w-5 text-ink-muted transition-transform group-open:rotate-180" />
            </summary>
            <ul className="mb-3 mt-1 space-y-1 text-xs font-medium text-ink-muted">
              <li><span className="font-semibold text-ink">Genauigkeit:</span> Punkte, die ungenauer sind, werden verworfen.</li>
              <li><span className="font-semibold text-ink">Zeit / Distanz:</span> ein neuer Punkt frühestens nach so vielen Sekunden bzw. Metern.</li>
              <li><span className="font-semibold text-ink">Max. Tempo:</span> Sprünge, die schneller wären, gelten als GPS-Fehler.</li>
            </ul>
          <div className="grid gap-4 pb-2 sm:grid-cols-4">
            <FormField>
              <FormLabel>GPS-Genauigkeit (m)</FormLabel>
              <FormInput
                type="number"
                min={1}
                value={draft.gpsAccuracyThresholdM}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    gpsAccuracyThresholdM: Number(event.target.value),
                  }))
                }
              />
            </FormField>

            <FormField>
              <FormLabel>GPS-Zeit (s)</FormLabel>
              <FormInput
                type="number"
                min={1}
                value={draft.gpsMinTimeS}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    gpsMinTimeS: Number(event.target.value),
                  }))
                }
              />
            </FormField>

            <FormField>
              <FormLabel>GPS-Distanz (m)</FormLabel>
              <FormInput
                type="number"
                min={1}
                value={draft.gpsMinDistanceM}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    gpsMinDistanceM: Number(event.target.value),
                  }))
                }
              />
            </FormField>

            <FormField>
              <FormLabel>Max. Tempo (m/s)</FormLabel>
              <FormInput
                type="number"
                min={1}
                step={0.5}
                value={draft.gpsMaxSpeedMps}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    gpsMaxSpeedMps: Number(event.target.value),
                  }))
                }
              />
            </FormField>
          </div>

          </details>

          <FormField>
            <FormLabel>Darstellung</FormLabel>
            <FormSelect
              value={draft.theme === 'light' ? 'light' : 'contrast'}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  theme: event.target.value === 'light' ? 'light' : 'contrast',
                }))
              }
            >
              <option value="contrast">Hoher Kontrast (für Sonne)</option>
              <option value="light">Pergament (weicher)</option>
            </FormSelect>
          </FormField>

          <FormField>
            <FormLabel>Bildschirm wach halten</FormLabel>
            <FormSelect
              value={draft.keepScreenAwake ?? 'recording'}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  keepScreenAwake: event.target.value as KeepScreenAwakeMode,
                }))
              }
            >
              <option value="recording">Während einer Aufzeichnung</option>
              <option value="always">Immer an, solange die App offen ist</option>
            </FormSelect>
            <p className="mt-1 text-xs font-medium text-ink-muted">
              {draft.keepScreenAwake === 'always'
                ? 'Der Bildschirm geht nicht aus, solange die App im Vordergrund ist – zuverlässig, braucht aber mehr Akku.'
                : 'Während ein Weidegang oder Arbeitseinsatz läuft, bleibt der Bildschirm an – auf jeder Seite der App.'}
            </p>
          </FormField>

          <label className="flex items-center gap-3 rounded-[1.25rem] border-2 border-border bg-surface-raised px-4 py-3">
            <input
              type="checkbox"
              checked={draft.tileCachingEnabled}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  tileCachingEnabled: event.target.checked,
                }))
              }
            />
            <span className="text-sm font-semibold">Angesehene Karten offline sichern</span>
          </label>

          <SettingsTileCachePanel {...tileCachePanel} tileCachingEnabled={draft.tileCachingEnabled} />

          <FormField>
            <FormLabel>Browser-Benachrichtigungen</FormLabel>
            <div className="rounded-[1.25rem] border-2 border-border bg-surface-raised px-4 py-3">
              <p className="text-sm font-medium text-ink-muted">
                {getBrowserNotificationStatusText(browserNotificationPermission)}
              </p>
              <FormButton
                type="button"
                onClick={onRequestBrowserNotifications}
                disabled={!canRequestBrowserNotifications}
                variant="secondary"
                className="mt-3"
              >
                {browserNotificationPermission === 'granted'
                  ? 'Browser-Benachrichtigungen aktiv'
                  : 'Browser-Benachrichtigungen aktivieren'}
              </FormButton>
            </div>
          </FormField>

          {status && <StatusAlert className="mt-3">{status}</StatusAlert>}

          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium text-ink-muted" aria-live="polite">
              {saving ? 'Speichert …' : 'Änderungen werden automatisch gespeichert.'}
            </p>
            <FormButton type="button" onClick={onResetSettings} variant="secondary">
              Standardwerte
            </FormButton>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
