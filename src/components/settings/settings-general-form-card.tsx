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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Allgemeine Einstellungen</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <FormField>
            <FormLabel>Sprache</FormLabel>
            <FormSelect
              value={draft.language}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  language: event.target.value as 'de' | 'it',
                }))
              }
            >
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
            </FormSelect>
          </FormField>

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

          <div className="grid gap-4 sm:grid-cols-3">
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

          <label className="flex items-center gap-3 rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3">
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
