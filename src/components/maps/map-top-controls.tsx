'use client'

import type { ComponentProps, ReactNode } from 'react'
import { CenterIcon, LayersIcon } from '@/components/maps/map-toolbar-icons'
import { MobileMapTopControls } from '@/components/maps/mobile-map-ui'
import { MetaLabel } from '@/components/ui/typography'
import { cn } from '@/lib/utils/cn'
import type { MapBaseLayer } from '@/types/domain'

type MapTopControlsProps = {
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
  extraMenuItems?: ReactNode
}

const mapMenuButtonBase =
  'w-full rounded-xl px-2.5 py-2 text-left text-xs font-medium'

function getMapMenuButtonClass(isActive: boolean, className?: string) {
  return cn(
    mapMenuButtonBase,
    isActive
      ? 'border border-border-strong bg-surface-muted text-ink'
      : 'bg-surface-muted text-ink-strong',
    className,
  )
}

/**
 * On/off toggle styled to match the items inside the base-layer menu. Exported so
 * callers can add their own toggles via `extraMenuItems` without re-deriving the styling.
 */
export function MapMenuToggleButton({
  active,
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'> & { active: boolean }) {
  return (
    <button
      type={type}
      className={cn(
        mapMenuButtonBase,
        active ? 'bg-accent text-ink' : 'bg-surface-muted text-ink-strong',
        className,
      )}
      {...props}
    />
  )
}

export function MapTopControls({
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
  extraMenuItems,
}: MapTopControlsProps) {
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
          <MetaLabel size="nano" tracking="wide" className="mb-1 px-1.5">
            Kartengrundlage
          </MetaLabel>
          <button
            type="button"
            onClick={() => void onUpdateBaseLayer('south-tyrol-orthophoto-2023')}
            className={getMapMenuButtonClass(
              baseLayer === 'south-tyrol-orthophoto-2023',
            )}
          >
            Orthofoto 2023
          </button>
          <button
            type="button"
            onClick={() => void onUpdateBaseLayer('south-tyrol-basemap')}
            className={getMapMenuButtonClass(
              baseLayer === 'south-tyrol-basemap',
              'mt-1.5',
            )}
          >
            BaseMap Südtirol
          </button>
          <MapMenuToggleButton
            active={showSurveyAreas}
            onClick={onToggleShowSurveyAreas}
            className="mt-1.5"
          >
            Flächen {showSurveyAreas ? 'an' : 'aus'}
          </MapMenuToggleButton>
          {extraMenuItems}
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
