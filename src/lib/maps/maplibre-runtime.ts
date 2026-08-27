import type { FeatureCollection } from 'geojson'
import type {
  CircleLayerSpecification,
  FilterSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
} from 'maplibre-gl'
import {
  fallbackCenter,
  rasterStyle,
  southTyrolOrthoLayerId,
  southTyrolOrthoSourceId,
  southTyrolOrthoTiles,
} from '@/lib/maps/base-map-style'
import { emptyFeatureCollection } from '@/lib/maps/map-core'
import { mapStyleColors } from '@/lib/maps/map-style-tokens'

type MapLibreModule = typeof import('maplibre-gl')

export function createRasterMap(maplibre: MapLibreModule, container: HTMLElement) {
  const map = new maplibre.Map({
    container,
    style: rasterStyle,
    center: fallbackCenter,
    zoom: 11,
    attributionControl: false,
  })

  map.addControl(new maplibre.NavigationControl(), 'top-right')
  // Always render the attribution in compact mode so it collapses to the
  // standard "ⓘ" toggle and can be opened/closed on every screen size, instead
  // of staying permanently expanded on desktop.
  map.addControl(
    new maplibre.AttributionControl({ compact: true }),
    'bottom-right'
  )

  return map
}

export function createDefaultMarker(maplibre: MapLibreModule) {
  return new maplibre.Marker({
    color: mapStyleColors.marker,
  })
}

export function addGeoJsonSource(map: MapLibreMap, sourceId: string) {
  map.addSource(sourceId, {
    type: 'geojson',
    data: emptyFeatureCollection,
  })
}

// Update a GeoJSON source's data, no-op if the map or source isn't ready yet.
export function setGeoJsonSourceData(
  map: MapLibreMap | null | undefined,
  sourceId: string,
  data: FeatureCollection
) {
  const source = map?.getSource(sourceId) as GeoJSONSource | undefined
  source?.setData(data)
}

// The invisible circle that makes a point tappable. 18px is sized for a gloved
// finger on a phone held at arm's length — the reason every point layer that
// accepts taps gets one of these instead of widening the visible marker.
const TOUCH_TARGET_RADIUS = 18

const pointsOnly: FilterSpecification = ['==', '$type', 'Point']
const linesOnly: FilterSpecification = ['==', '$type', 'LineString']
const polygonsOnly: FilterSpecification = ['==', '$type', 'Polygon']

type LayerBase = {
  id: string
  source: string
  /**
   * Restrict the layer to one geometry type. Needed wherever a single source
   * carries a path's polygon, line and points together, so each layer must pick
   * out its own; omit for sources that hold one geometry type.
   */
  filterGeometry?: boolean
}

/** Translucent area fill, e.g. a saved or in-progress enclosure. */
export function addAreaFillLayer(
  map: MapLibreMap,
  { id, source, color, opacity, filterGeometry }: LayerBase & { color: string; opacity: number }
) {
  map.addLayer({
    id,
    type: 'fill',
    source,
    paint: {
      'fill-color': color,
      'fill-opacity': opacity,
    },
    ...(filterGeometry ? { filter: polygonsOnly } : {}),
  })
}

/** The outline of an area, or the line connecting a path's points. */
export function addPathLineLayer(
  map: MapLibreMap,
  { id, source, color, width, filterGeometry }: LayerBase & { color: string; width: number }
) {
  map.addLayer({
    id,
    type: 'line',
    source,
    paint: {
      'line-color': color,
      'line-width': width,
    },
    ...(filterGeometry ? { filter: linesOnly } : {}),
  })
}

/** A path's individual points, drawn as stroked circles. */
export function addPathPointLayer(
  map: MapLibreMap,
  {
    id,
    source,
    color,
    radius,
    strokeWidth,
    strokeColor = mapStyleColors.white,
  }: LayerBase & {
    color: NonNullable<CircleLayerSpecification['paint']>['circle-color']
    radius: number
    strokeWidth: number
    strokeColor?: string
  }
) {
  map.addLayer({
    id,
    type: 'circle',
    source,
    paint: {
      'circle-radius': radius,
      'circle-color': color,
      'circle-stroke-width': strokeWidth,
      'circle-stroke-color': strokeColor,
    },
    filter: pointsOnly,
  })
}

/**
 * An all-but-invisible circle layer that widens the tap area of a point layer.
 * Add it after the visible points so it sits on top and receives the click.
 */
export function addTouchTargetLayer(map: MapLibreMap, { id, source }: LayerBase) {
  map.addLayer({
    id,
    type: 'circle',
    source,
    paint: {
      'circle-radius': TOUCH_TARGET_RADIUS,
      'circle-color': mapStyleColors.white,
      'circle-opacity': 0.01,
    },
    filter: pointsOnly,
  })
}

/**
 * Calls `onSelect` with the zero-based array index of a clicked point. The
 * feature collections number their points from 1, so this is where that offset
 * is undone — `indexProperty` must match the property the collection wrote.
 */
export function bindPointIndexClick(
  map: MapLibreMap,
  layerId: string,
  indexProperty: string,
  onSelect: (index: number) => void
) {
  map.on('click', layerId, (event) => {
    const pointIndex = Number(event.features?.[0]?.properties?.[indexProperty])
    if (Number.isInteger(pointIndex) && pointIndex >= 1) {
      onSelect(pointIndex - 1)
    }
  })
}

/** Calls `onSelect` with the clicked feature's `id` property. */
export function bindFeatureIdClick(
  map: MapLibreMap,
  layerId: string,
  onSelect: (featureId: string) => void
) {
  map.on('click', layerId, (event) => {
    const featureId = event.features?.[0]?.properties?.id
    if (typeof featureId === 'string') {
      onSelect(featureId)
    }
  })
}

export function addSurveyAreaLayers(map: MapLibreMap) {
  addGeoJsonSource(map, 'survey-areas')

  map.addLayer({
    id: 'survey-areas-fill',
    type: 'fill',
    source: 'survey-areas',
    paint: {
      'fill-color': mapStyleColors.surveyAreaFill,
      'fill-opacity': 0.1,
    },
  })

  map.addLayer({
    id: 'survey-areas-line',
    type: 'line',
    source: 'survey-areas',
    paint: {
      'line-color': mapStyleColors.surveyAreaLine,
      'line-width': 2,
      'line-dasharray': [2, 2],
    },
  })
}

export function addOrthophotoLayer(map: MapLibreMap) {
  map.addSource(southTyrolOrthoSourceId, {
    type: 'raster',
    tiles: southTyrolOrthoTiles,
    tileSize: 256,
    attribution: 'Provincia autonoma di Bolzano - Orthofoto 2023 (20 cm)',
  })

  map.addLayer({
    id: southTyrolOrthoLayerId,
    type: 'raster',
    source: southTyrolOrthoSourceId,
    layout: {
      visibility: 'visible',
    },
    paint: {
      'raster-opacity': 1,
    },
  })
}

export function bindPointerCursor(map: MapLibreMap, layerIds: string[]) {
  layerIds.forEach((layerId) => {
    map.on('mouseenter', layerId, () => {
      map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = ''
    })
  })
}
