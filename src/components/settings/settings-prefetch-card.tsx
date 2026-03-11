'use client'

import type { FormEventHandler } from 'react'
import { PositionPreviewMap } from '@/components/settings/position-preview-map'
import {
  prefetchLayerOptions,
  type PrefetchLayerChoice,
} from '@/components/settings/settings-options'

type PrefetchProgress = {
  completed: number
  total: number
}

type SettingsPrefetchCardState = {
  isOpen: boolean
  prefetchLat: string
  prefetchLon: string
  prefetchRadiusKm: string
  prefetchZoomLevel: string
  prefetchLayerChoice: PrefetchLayerChoice
  prefetchStatus: string
  prefetchError: string
  prefetchProgress: PrefetchProgress | null
  prefetching: boolean
  southTyrolPrefetching: boolean
  highDetailPrefetching: boolean
  currentPositionLoading: boolean
  currentPositionStatus: string
  parsedPreviewPosition: { latitude: number; longitude: number } | null
}

type SettingsPrefetchCardActions = {
  onToggleOpen: () => void
  onSubmit: FormEventHandler<HTMLFormElement>
  onPrefetchLatChange: (value: string) => void
  onPrefetchLonChange: (value: string) => void
  onPrefetchRadiusKmChange: (value: string) => void
  onPrefetchZoomLevelChange: (value: string) => void
  onPrefetchLayerChoiceChange: (value: PrefetchLayerChoice) => void
  onApplyCurrentPosition: () => void
  onPrefetchWholeSouthTyrol: () => void | Promise<void>
  onPrefetchHighDetailArea: () => void | Promise<void>
}

type SettingsPrefetchCardProps = {
  state: SettingsPrefetchCardState
  actions: SettingsPrefetchCardActions
}

export function SettingsPrefetchCard({ state, actions }: SettingsPrefetchCardProps) {
  const previewZoom = Number(state.prefetchZoomLevel)

  return (
    <section className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
      <button
        type="button"
        onClick={actions.onToggleOpen}
        aria-expanded={state.isOpen}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div>
          <h2 className="text-lg font-semibold">Kartenausschnitt vorladen</h2>
          <p className="mt-2 text-sm font-medium text-neutral-800">
            Bestimmten Ausschnitt gezielt in den Tile-Cache laden, statt nur beim normalen
            Kartenaufruf.
          </p>
        </div>
        <div className="text-base text-neutral-900">{state.isOpen ? '−' : '+'}</div>
      </button>

      {state.isOpen ? (
        <form className="mt-4 space-y-4" onSubmit={actions.onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Breitengrad</label>
              <input
                className="w-full rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm"
                value={state.prefetchLat}
                onChange={(event) => actions.onPrefetchLatChange(event.target.value)}
                placeholder="z. B. 46.65"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Längengrad</label>
              <input
                className="w-full rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm"
                value={state.prefetchLon}
                onChange={(event) => actions.onPrefetchLonChange(event.target.value)}
                placeholder="z. B. 11.35"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={actions.onApplyCurrentPosition}
            disabled={state.currentPositionLoading}
            className="rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-neutral-900"
          >
            {state.currentPositionLoading
              ? 'Standort wird bestimmt ...'
              : 'Aktuellen Standort übernehmen'}
          </button>

          {state.currentPositionStatus ? (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-900">
              {state.currentPositionStatus}
            </div>
          ) : null}

          {state.parsedPreviewPosition ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-neutral-900">Aktuelle Position auf der Karte</div>
              <PositionPreviewMap
                latitude={state.parsedPreviewPosition.latitude}
                longitude={state.parsedPreviewPosition.longitude}
              />
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Radius (km)</label>
              <input
                type="number"
                min={0.1}
                step={0.1}
                className="w-full rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm"
                value={state.prefetchRadiusKm}
                onChange={(event) => actions.onPrefetchRadiusKmChange(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 flex items-center justify-between gap-3 text-sm font-medium">
                <span>Zoomlevel</span>
                <span className="rounded-full bg-[#f1efeb] px-2 py-0.5 text-xs text-neutral-700">
                  {state.prefetchZoomLevel}
                </span>
              </label>
              <input
                type="range"
                min={1}
                max={20}
                className="w-full accent-[#5a5347]"
                value={state.prefetchZoomLevel}
                onChange={(event) => actions.onPrefetchZoomLevelChange(event.target.value)}
              />
              <p className="mt-2 text-xs font-medium text-neutral-700">
                Verwendet intern ungefähr Zoom {Math.max(1, previewZoom - 1)} bis{' '}
                {Math.min(20, previewZoom + 1)}.
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Layer</label>
            <select
              className="w-full rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm"
              value={state.prefetchLayerChoice}
              onChange={(event) =>
                actions.onPrefetchLayerChoiceChange(event.target.value as PrefetchLayerChoice)
              }
            >
              {prefetchLayerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs font-medium text-neutral-700">
            Größere Radius-/Zoom-Kombinationen erzeugen sehr viele Tiles. Der Vorlade-Block
            begrenzt das bewusst.
          </p>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-4 text-sm text-neutral-900">
              <div className="font-medium">Südtirol Übersicht</div>
              <div className="mt-1 text-neutral-700">
                Lädt die komplette Landesfläche mit sicheren Übersichts-Zoomstufen 8 bis 12.
              </div>
              <button
                type="button"
                onClick={() => void actions.onPrefetchWholeSouthTyrol()}
                disabled={
                  state.southTyrolPrefetching || state.prefetching || state.highDetailPrefetching
                }
                className="mt-3 rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-neutral-950 disabled:opacity-50"
              >
                {state.southTyrolPrefetching
                  ? 'Lädt Übersicht ...'
                  : 'Südtirol Übersicht sichern'}
              </button>
            </div>

            <div className="rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-4 text-sm text-neutral-900">
              <div className="font-medium">Einsatzgebiet hoch detailliert</div>
              <div className="mt-1 text-neutral-700">
                Nutzt den aktuellen Standort im Formular und lädt einen Radius von 2 km in Zoom
                13 bis 17.
              </div>
              <button
                type="button"
                onClick={() => void actions.onPrefetchHighDetailArea()}
                disabled={
                  state.highDetailPrefetching || state.prefetching || state.southTyrolPrefetching
                }
                className="mt-3 rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-neutral-950 disabled:opacity-50"
              >
                {state.highDetailPrefetching ? 'Lädt Detailgebiet ...' : 'Detailgebiet sichern'}
              </button>
            </div>
          </div>

          {state.prefetchProgress ? (
            <div className="rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-neutral-900">
              Fortschritt:{' '}
              <span className="font-medium text-neutral-900">
                {state.prefetchProgress.completed}
              </span>
              {' / '}
              <span className="font-medium text-neutral-900">{state.prefetchProgress.total}</span>{' '}
              Tiles
            </div>
          ) : null}

          {state.prefetchError ? (
            <div className="rounded-2xl border border-red-300 bg-red-100 px-4 py-3 text-sm font-semibold text-red-900">
              {state.prefetchError}
            </div>
          ) : null}

          {state.prefetchStatus ? (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-900">
              {state.prefetchStatus}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={state.prefetching}
            className="rounded-[1.25rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-4 font-semibold text-[#17130f] shadow-[0_12px_24px_rgba(40,34,26,0.08)] disabled:opacity-50"
          >
            {state.prefetching ? 'Lädt Tiles ...' : 'Ausschnitt vorladen'}
          </button>
        </form>
      ) : null}
    </section>
  )
}
