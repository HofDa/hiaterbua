import type { FeatureCollection } from 'geojson'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
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
  map.addControl(
    new maplibre.AttributionControl({
      compact:
        typeof window !== 'undefined'
          ? window.matchMedia('(max-width: 768px)').matches
          : false,
    }),
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
