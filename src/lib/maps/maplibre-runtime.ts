import type { Map as MapLibreMap } from 'maplibre-gl'
import {
  fallbackCenter,
  rasterStyle,
  southTyrolOrthoLayerId,
  southTyrolOrthoSourceId,
  southTyrolOrthoTiles,
} from '@/lib/maps/base-map-style'
import { emptyFeatureCollection } from '@/lib/maps/map-core'

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
    color: '#111827',
  })
}

export function addGeoJsonSource(map: MapLibreMap, sourceId: string) {
  map.addSource(sourceId, {
    type: 'geojson',
    data: emptyFeatureCollection,
  })
}

export function addSurveyAreaLayers(map: MapLibreMap) {
  addGeoJsonSource(map, 'survey-areas')

  map.addLayer({
    id: 'survey-areas-fill',
    type: 'fill',
    source: 'survey-areas',
    paint: {
      'fill-color': '#7c3aed',
      'fill-opacity': 0.1,
    },
  })

  map.addLayer({
    id: 'survey-areas-line',
    type: 'line',
    source: 'survey-areas',
    paint: {
      'line-color': '#6d28d9',
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
