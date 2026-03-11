'use client'

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
}: LivePositionMapTopControlsProps) {
  return (
    <MobileMapTopControls>
      <div className="mb-2 flex justify-start gap-2">
        <button
          type="button"
          aria-label="Auf aktuelle Position zentrieren"
          onClick={onCenterMap}
          disabled={!positionAvailable}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ccb98a] bg-[#fffdf6] text-neutral-950 shadow-lg disabled:opacity-50"
        >
          <CenterIcon />
        </button>
        <button
          type="button"
          aria-label="Kartengrundlage wählen"
          onClick={onToggleBaseLayerMenu}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ccb98a] bg-[#fffdf6] text-neutral-950 shadow-lg"
        >
          <LayersIcon />
        </button>
      </div>

      {isBaseLayerMenuOpen ? (
        <div className="max-h-[48vh] overflow-y-auto rounded-[1rem] border border-[#ccb98a] bg-[rgba(255,253,246,0.96)] p-1.5 shadow-lg">
          <div className="mb-1 px-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-700">
            Kartengrundlage
          </div>
          <button
            type="button"
            onClick={() => void onUpdateBaseLayer('south-tyrol-orthophoto-2023')}
            className={[
              'w-full rounded-xl px-2.5 py-2 text-left text-xs font-medium',
              baseLayer === 'south-tyrol-orthophoto-2023'
                ? 'border border-[#5a5347] bg-[#f1efeb] text-[#17130f]'
                : 'bg-[#f1efeb] text-neutral-950',
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
                ? 'border border-[#5a5347] bg-[#f1efeb] text-[#17130f]'
                : 'bg-[#f1efeb] text-neutral-950',
            ].join(' ')}
          >
            BaseMap Südtirol
          </button>
          <button
            type="button"
            onClick={onToggleShowSurveyAreas}
            className={[
              'mt-1.5 w-full rounded-xl px-2.5 py-2 text-left text-xs font-medium',
              showSurveyAreas ? 'bg-[#efe4c8] text-[#17130f]' : 'bg-[#f1efeb] text-neutral-950',
            ].join(' ')}
          >
            Flächen {showSurveyAreas ? 'an' : 'aus'}
          </button>
          <button
            type="button"
            onClick={() => void onPrefetchVisibleMapArea()}
            disabled={prefetchingMapArea}
            className="mt-1.5 w-full rounded-xl border border-[#ccb98a] bg-[#fffdf6] px-2.5 py-2 text-left text-xs font-medium text-[#17130f] disabled:opacity-50"
          >
            {prefetchingMapArea ? 'Sichert ...' : 'Ausschnitt sichern'}
          </button>
          {prefetchStatus ? (
            <div className="mt-1.5 rounded-xl bg-[#f1efeb] px-2.5 py-2 text-[11px] font-medium text-neutral-900">
              {prefetchStatus}
            </div>
          ) : null}
        </div>
      ) : null}
    </MobileMapTopControls>
  )
}
