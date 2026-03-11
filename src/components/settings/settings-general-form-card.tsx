'use client'

import type { Dispatch, FormEventHandler, SetStateAction } from 'react'
import { settingsMapOptions } from '@/components/settings/settings-options'
import {
  SettingsTileCachePanel,
  type SettingsTileCachePanelProps,
} from '@/components/settings/settings-tile-cache-panel'
import type { AppSettings, MapBaseLayer } from '@/types/domain'

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
    <section className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium">Sprache</label>
          <select
            className="w-full rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm"
            value={draft.language}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                language: event.target.value as AppSettings['language'],
              }))
            }
          >
            <option value="de">Deutsch</option>
            <option value="it">Italienisch</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Kartengrundlage</label>
          <select
            className="w-full rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm"
            value={draft.mapBaseLayer}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                mapBaseLayer: event.target.value as MapBaseLayer,
              }))
            }
          >
            {settingsMapOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs font-medium text-neutral-700">
            Empfohlen: Orthofoto 2023 für maximale Details, BaseMap Südtirol für bessere
            Lesbarkeit.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">GPS-Genauigkeitsschwelle (m)</label>
          <input
            type="number"
            min={1}
            className="w-full rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm"
            value={draft.gpsAccuracyThresholdM}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                gpsAccuracyThresholdM: Number(event.target.value) || 1,
              }))
            }
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">GPS Mindestzeit (s)</label>
          <input
            type="number"
            min={1}
            className="w-full rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm"
            value={draft.gpsMinTimeS}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                gpsMinTimeS: Number(event.target.value) || 1,
              }))
            }
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">GPS Mindestdistanz (m)</label>
          <input
            type="number"
            min={1}
            className="w-full rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm"
            value={draft.gpsMinDistanceM}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                gpsMinDistanceM: Number(event.target.value) || 1,
              }))
            }
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Design</label>
          <select
            className="w-full rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm"
            value={draft.theme}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                theme: event.target.value as AppSettings['theme'],
              }))
            }
          >
            <option value="system">System</option>
            <option value="light">Hell</option>
          </select>
        </div>

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
          <span className="text-sm">Tile-Caching aktivieren</span>
        </label>

        <SettingsTileCachePanel {...tileCachePanel} tileCachingEnabled={draft.tileCachingEnabled} />

        {status ? (
          <div className="rounded-[1.25rem] border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-900">
            {status}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-[1.25rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-4 font-medium text-[#17130f] shadow-[0_12px_24px_rgba(40,34,26,0.08)] disabled:opacity-50"
          >
            {saving ? 'Speichert ...' : 'Einstellungen speichern'}
          </button>
          <button
            type="button"
            onClick={onResetSettings}
            className="rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-4 font-semibold text-neutral-950"
          >
            Standardwerte
          </button>
        </div>
      </form>
    </section>
  )
}
