'use client'

import type { Dispatch, FormEventHandler, SetStateAction } from 'react'
import { settingsMapOptions } from '@/components/settings/settings-options'
import {
  SettingsTileCachePanel,
  type SettingsTileCachePanelProps,
} from '@/components/settings/settings-tile-cache-panel'
import type { AppSettings, MapBaseLayer } from '@/types/domain'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField, FormLabel, FormSelect, FormInput, FormButton } from '@/components/ui/form'
import { StatusAlert } from '@/components/ui/alert'
import { gpsPresets, getGpsTuning, matchGpsPreset } from '@/lib/settings/gps-presets'
import { cn } from '@/lib/utils/cn'

type SettingsGeneralFormCardProps = {
  draft: AppSettings
  setDraft: Dispatch<SetStateAction<AppSettings>>
  status: string
  saving: boolean
  onSubmit: FormEventHandler<HTMLFormElement>
  onResetSettings: () => void
  tileCachePanel: SettingsTileCachePanelProps
}

export function SettingsGeneralFormCard({
  draft,
  setDraft,
  status,
  saving,
  onSubmit,
  onResetSettings,
  tileCachePanel,
}: SettingsGeneralFormCardProps) {
  const activePreset = matchGpsPreset(draft)
  const activePresetDescription = gpsPresets.find((preset) => preset.id === activePreset)?.description

  return (
    <Card>
      <CardHeader>
        <CardTitle>Allgemeine Einstellungen</CardTitle>
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
                      'min-h-11 rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors',
                      active
                        ? 'border-border-ink bg-primary text-primary-foreground'
                        : 'border-border bg-surface-raised text-ink hover:bg-surface-hover',
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

          <div className="grid gap-4 sm:grid-cols-4">
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

          <FormField>
            <FormLabel>Design</FormLabel>
            <FormSelect
              value={draft.theme}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  theme: event.target.value as 'system' | 'light',
                }))
              }
            >
              <option value="system">System</option>
              <option value="light">Hell</option>
            </FormSelect>
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
            <span className="text-sm font-medium">Kachel-Caching aktivieren</span>
          </label>

          <SettingsTileCachePanel {...tileCachePanel} tileCachingEnabled={draft.tileCachingEnabled} />

          {status && <StatusAlert className="mt-3">{status}</StatusAlert>}

          <div className="flex gap-3">
            <FormButton type="submit" disabled={saving} variant="primary">
              {saving ? 'Speichert ...' : 'Einstellungen speichern'}
            </FormButton>
            <FormButton type="button" onClick={onResetSettings} variant="secondary">
              Standardwerte
            </FormButton>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
