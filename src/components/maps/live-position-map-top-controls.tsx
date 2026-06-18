'use client'

import type { ReactNode } from 'react'
import { CenterIcon, LayersIcon } from '@/components/maps/map-toolbar-icons'
import { MobileMapTopControls } from '@/components/maps/mobile-map-ui'
import type { MapBaseLayer } from '@/types/domain'

type LivePositionMapTopControlsProps = {
  positionAvailable: boolean
  isBaseLayerMenuOpen: boolean
  baseLayer: MapBaseLayer
  showSurveyAreas: boolean
  prefetchingMapArea: boolean
  prefetchStatus: string
  onCenterMap: () => void
  onToggleBaseLayerMenu: () => void
  onUpdateBaseLayer: (nextBaseLayer: MapBaseLayer) => void | Promise<void>
  onToggleShowSurveyAreas: () => void
  onPrefetchVisibleMapArea: () => void | Promise<void>
  extraControls?: ReactNode
}

export function LivePositionMapTopControls({
  positionAvailable,
  isBaseLayerMenuOpen,
  baseLayer,
  showSurveyAreas,
  prefetchingMapArea,
  prefetchStatus,
  onCenterMap,
  onToggleBaseLayerMenu,
  onUpdateBaseLayer,
  onToggleShowSurveyAreas,
  onPrefetchVisibleMapArea,
  extraControls,
}: LivePositionMapTopControlsProps) {
  return (
    <MobileMapTopControls>
      <div className="mb-2 flex justify-start gap-2">
        <button
          type="button"
          aria-label="Auf aktuelle Position zentrieren"
          onClick={onCenterMap}
          disabled={!positionAvailable}
          className="flex items-center justify-center app-map-icon-button text-ink-strong disabled:opacity-50"
        >
          <CenterIcon />
        </button>
        <button
          type="button"
          aria-label="Kartengrundlage wählen"
          onClick={onToggleBaseLayerMenu}
          className="flex items-center justify-center app-map-icon-button text-ink-strong"
        >
          <LayersIcon />
        </button>
        {extraControls}
      </div>

      {isBaseLayerMenuOpen ? (
        <div className="max-h-[48vh] overflow-y-auto app-map-popover p-1.5">
          <div className="mb-1 px-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Kartengrundlage
          </div>
          <button
            type="button"
            onClick={() => void onUpdateBaseLayer('south-tyrol-orthophoto-2023')}
            className={[
              'w-full rounded-xl px-2.5 py-2 text-left text-xs font-medium',
              baseLayer === 'south-tyrol-orthophoto-2023'
                ? 'border border-border-strong bg-surface-muted text-ink'
                : 'bg-surface-muted text-ink-strong',
            ].join(' ')}
          >
            Orthofoto 2023
          </button>
          <button
            type="button"
            onClick={() => void onUpdateBaseLayer('south-tyrol-basemap')}
            className={[
              'mt-1.5 w-full rounded-xl px-2.5 py-2 text-left text-xs font-medium',
              baseLayer === 'south-tyrol-basemap'
                ? 'border border-border-strong bg-surface-muted text-ink'
                : 'bg-surface-muted text-ink-strong',
            ].join(' ')}
          >
            BaseMap Südtirol
          </button>
          <button
            type="button"
            onClick={onToggleShowSurveyAreas}
            className={[
              'mt-1.5 w-full rounded-xl px-2.5 py-2 text-left text-xs font-medium',
              showSurveyAreas ? 'bg-accent text-ink' : 'bg-surface-muted text-ink-strong',
            ].join(' ')}
          >
            Flächen {showSurveyAreas ? 'an' : 'aus'}
          </button>
          <button
            type="button"
            onClick={() => void onPrefetchVisibleMapArea()}
            disabled={prefetchingMapArea}
            className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised px-2.5 py-2 text-left text-xs font-medium text-ink disabled:opacity-50"
          >
            {prefetchingMapArea ? 'Sichert ...' : 'Ausschnitt sichern'}
          </button>
          {prefetchStatus ? (
            <div className="mt-1.5 rounded-xl bg-surface-muted px-2.5 py-2 text-[11px] font-medium text-ink">
              {prefetchStatus}
            </div>
          ) : null}
        </div>
      ) : null}
    </MobileMapTopControls>
  )
}
