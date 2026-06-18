import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl'
import {
  addGeoJsonSource,
  addOrthophotoLayer,
  addSurveyAreaLayers,
  bindPointerCursor,
} from '@/lib/maps/maplibre-runtime'
import { mapStyleColors } from '@/lib/maps/map-style-tokens'

type GrazingSessionMapSetupHandlers = {
  onMapClick: (event: MapMouseEvent) => void
  onSelectedTrackpointClick: (index: number) => void
}

export function registerGrazingSessionMapSetup(
  map: MapLibreMap,
  handlers: GrazingSessionMapSetupHandlers
) {
  const eventColors = mapStyleColors.sessionEvent

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
        eventColors.water,
        'rest',
        eventColors.rest,
        'disturbance',
        eventColors.disturbance,
        'note',
        eventColors.note,
        'move',
        eventColors.move,
        'pause',
        eventColors.pause,
        'resume',
        eventColors.resume,
        'stop',
        eventColors.stop,
        eventColors.fallback,
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': mapStyleColors.white,
    },
  })

  addGeoJsonSource(map, 'current-session-track')
  map.addLayer({
    id: 'current-session-track-line',
    type: 'line',
    source: 'current-session-track',
    paint: {
      'line-color': mapStyleColors.currentSessionTrack,
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
      'circle-color': mapStyleColors.currentSessionTrack,
      'circle-stroke-width': 2,
      'circle-stroke-color': mapStyleColors.white,
    },
    filter: ['==', '$type', 'Point'],
  })

  addGeoJsonSource(map, 'selected-session-track')
  map.addLayer({
    id: 'selected-session-track-line',
    type: 'line',
    source: 'selected-session-track',
    paint: {
      'line-color': mapStyleColors.selectedSessionTrack,
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
      'circle-color': mapStyleColors.selectedSessionTrack,
      'circle-stroke-width': 3,
      'circle-stroke-color': mapStyleColors.white,
    },
    filter: ['==', '$type', 'Point'],
  })

  map.addLayer({
    id: 'selected-session-track-touch-target',
    type: 'circle',
    source: 'selected-session-track',
    paint: {
      'circle-radius': 18,
      'circle-color': mapStyleColors.white,
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
