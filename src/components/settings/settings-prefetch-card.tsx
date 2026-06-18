'use client'

import type { FormEventHandler } from 'react'
import { PositionPreviewMap } from '@/components/settings/position-preview-map'
import {
  prefetchLayerOptions,
  type PrefetchLayerChoice,
} from '@/components/settings/settings-options'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { FormField, FormLabel, FormInput, FormSelect, FormButton } from '@/components/ui/form'
import { Alert, StatusAlert, ErrorAlert } from '@/components/ui/alert'

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
    <Card>
      <CardHeader>
        <button
          type="button"
          onClick={actions.onToggleOpen}
          aria-expanded={state.isOpen}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <div>
            <CardTitle className="text-lg">Kartenausschnitt vorladen</CardTitle>
            <p className="mt-2 text-sm font-medium text-ink-soft">
              Bestimmten Ausschnitt gezielt in den Tile-Cache laden, statt nur beim normalen
              Kartenaufruf.
            </p>
          </div>
          <div className="text-base text-ink">{state.isOpen ? '−' : '+'}</div>
        </button>
      </CardHeader>

      {state.isOpen ? (
        <CardContent>
          <form className="mt-4 space-y-4" onSubmit={actions.onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField>
              <FormLabel>Breitengrad</FormLabel>
              <FormInput
                value={state.prefetchLat}
                onChange={(event) => actions.onPrefetchLatChange(event.target.value)}
                placeholder="z. B. 46.65"
              />
            </FormField>
            <FormField>
              <FormLabel>Längengrad</FormLabel>
              <FormInput
                value={state.prefetchLon}
                onChange={(event) => actions.onPrefetchLonChange(event.target.value)}
                placeholder="z. B. 11.35"
              />
            </FormField>
          </div>

          <FormButton
            type="button"
            onClick={actions.onApplyCurrentPosition}
            disabled={state.currentPositionLoading}
            variant="secondary"
          >
            {state.currentPositionLoading
              ? 'Standort wird bestimmt ...'
              : 'Aktuellen Standort übernehmen'}
          </FormButton>

          {state.currentPositionStatus && (
            <StatusAlert>{state.currentPositionStatus}</StatusAlert>
          )}

          {state.parsedPreviewPosition ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-ink">Aktuelle Position auf der Karte</div>
              <PositionPreviewMap
                latitude={state.parsedPreviewPosition.latitude}
                longitude={state.parsedPreviewPosition.longitude}
              />
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField>
              <FormLabel>Radius (km)</FormLabel>
              <FormInput
                type="number"
                min={0.1}
                step={0.1}
                value={state.prefetchRadiusKm}
                onChange={(event) => actions.onPrefetchRadiusKmChange(event.target.value)}
              />
            </FormField>
            <div>
              <FormLabel className="mb-1 flex items-center justify-between gap-3">
                <span>Zoomlevel</span>
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-ink-muted">
                  {state.prefetchZoomLevel}
                </span>
              </FormLabel>
              <input
                type="range"
                min={1}
                max={20}
                className="w-full accent-border-strong"
                value={state.prefetchZoomLevel}
                onChange={(event) => actions.onPrefetchZoomLevelChange(event.target.value)}
              />
              <p className="mt-2 text-xs font-medium text-ink-muted">
                Verwendet intern ungefähr Zoom {Math.max(1, previewZoom - 1)} bis{' '}
                {Math.min(20, previewZoom + 1)}.
              </p>
            </div>
          </div>

          <FormField>
            <FormLabel>Layer</FormLabel>
            <FormSelect
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
            </FormSelect>
          </FormField>

          <p className="text-xs font-medium text-ink-muted">
            Größere Radius-/Zoom-Kombinationen erzeugen sehr viele Tiles. Der Vorlade-Block
            begrenzt das bewusst.
          </p>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="px-4 py-4 text-sm text-ink">
              <div className="font-medium">Südtirol Übersicht</div>
              <div className="mt-1 text-ink-muted">
                Lädt die komplette Landesfläche mit sicheren Übersichts-Zoomstufen 8 bis 12.
              </div>
              <FormButton
                type="button"
                onClick={() => void actions.onPrefetchWholeSouthTyrol()}
                disabled={
                  state.southTyrolPrefetching || state.prefetching || state.highDetailPrefetching
                }
                variant="secondary"
                className="mt-3"
              >
                {state.southTyrolPrefetching
                  ? 'Lädt Übersicht ...'
                  : 'Südtirol Übersicht sichern'}
              </FormButton>
            </Card>

            <Card className="px-4 py-4 text-sm text-ink">
              <div className="font-medium">Einsatzgebiet hoch detailliert</div>
              <div className="mt-1 text-ink-muted">
                Nutzt den aktuellen Standort im Formular und lädt einen Radius von 2 km in Zoom
                13 bis 17.
              </div>
              <FormButton
                type="button"
                onClick={() => void actions.onPrefetchHighDetailArea()}
                disabled={
                  state.highDetailPrefetching || state.prefetching || state.southTyrolPrefetching
                }
                variant="secondary"
                className="mt-3"
              >
                {state.highDetailPrefetching ? 'Lädt Detailgebiet ...' : 'Detailgebiet sichern'}
              </FormButton>
            </Card>
          </div>

          {state.prefetchProgress && (
            <Alert variant="info" className="text-sm font-medium text-ink">
              Fortschritt:{' '}
              <span className="font-medium text-ink">
                {state.prefetchProgress.completed}
              </span>
              {' / '}
              <span className="font-medium text-ink">{state.prefetchProgress.total}</span>{' '}
              Tiles
            </Alert>
          )}

          {state.prefetchError && (
            <ErrorAlert>{state.prefetchError}</ErrorAlert>
          )}

          {state.prefetchStatus ? (
            <StatusAlert>{state.prefetchStatus}</StatusAlert>
          ) : null}

          <FormButton
            type="submit"
            disabled={state.prefetching}
            variant="primary"
            className="rounded-[1.25rem]"
          >
            {state.prefetching ? 'Lädt Tiles ...' : 'Ausschnitt vorladen'}
          </FormButton>
        </form>
        </CardContent>
      ) : null}
    </Card>
  )
}
