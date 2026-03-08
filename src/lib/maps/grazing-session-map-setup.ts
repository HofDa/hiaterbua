import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl'
import {
  addGeoJsonSource,
  addOrthophotoLayer,
  addSurveyAreaLayers,
  bindPointerCursor,
} from '@/lib/maps/maplibre-runtime'

type GrazingSessionMapSetupHandlers = {
  onMapClick: (event: MapMouseEvent) => void
  onSelectedTrackpointClick: (index: number) => void
}

export function registerGrazingSessionMapSetup(
  map: MapLibreMap,
  handlers: GrazingSessionMapSetupHandlers
) {
  addOrthophotoLayer(map)
  addSurveyAreaLayers(map)

  addGeoJsonSource(map, 'session-events')
  map.addLayer({
    id: 'session-events-points',
    type: 'circle',
    source: 'session-events',
    paint: {
      'circle-radius': 7,
      'circle-color': [
        'match',
        ['get', 'type'],
        'water',
        '#0369a1',
        'rest',
        '#b45309',
        'disturbance',
        '#be123c',
        'note',
        '#111827',
        'move',
        '#047857',
        'pause',
        '#7c2d12',
        'resume',
        '#166534',
        'stop',
        '#4b5563',
        '#2563eb',
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  })

  addGeoJsonSource(map, 'current-session-track')
  map.addLayer({
    id: 'current-session-track-line',
    type: 'line',
    source: 'current-session-track',
    paint: {
      'line-color': '#2563eb',
      'line-width': 4,
    },
    filter: ['==', '$type', 'LineString'],
  })

  map.addLayer({
    id: 'current-session-track-points',
    type: 'circle',
    source: 'current-session-track',
    paint: {
      'circle-radius': 4,
      'circle-color': '#2563eb',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
    filter: ['==', '$type', 'Point'],
  })

  addGeoJsonSource(map, 'selected-session-track')
  map.addLayer({
    id: 'selected-session-track-line',
    type: 'line',
    source: 'selected-session-track',
    paint: {
      'line-color': '#0f766e',
      'line-width': 4,
    },
    filter: ['==', '$type', 'LineString'],
  })

  map.addLayer({
    id: 'selected-session-track-points',
    type: 'circle',
    source: 'selected-session-track',
    paint: {
      'circle-radius': 7,
      'circle-color': '#0f766e',
      'circle-stroke-width': 3,
      'circle-stroke-color': '#ffffff',
    },
    filter: ['==', '$type', 'Point'],
  })

  map.addLayer({
    id: 'selected-session-track-touch-target',
    type: 'circle',
    source: 'selected-session-track',
    paint: {
      'circle-radius': 18,
      'circle-color': '#ffffff',
      'circle-opacity': 0.01,
    },
    filter: ['==', '$type', 'Point'],
  })

  map.on('click', handlers.onMapClick)

  map.on('click', 'selected-session-track-touch-target', (event) => {
    const pointIndex = Number(event.features?.[0]?.properties?.seq)
    if (Number.isInteger(pointIndex) && pointIndex >= 1) {
      handlers.onSelectedTrackpointClick(pointIndex - 1)
    }
  })

  bindPointerCursor(map, ['selected-session-track-touch-target'])
}
