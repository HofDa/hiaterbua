import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl'
import {
  addGeoJsonSource,
  addOrthophotoLayer,
  addPathLineLayer,
  addPathPointLayer,
  addSurveyAreaLayers,
  addTouchTargetLayer,
  bindPointerCursor,
  bindPointIndexClick,
} from '@/lib/maps/maplibre-runtime'
import { mapStyleColors } from '@/lib/maps/map-style-tokens'

type GrazingSessionMapSetupHandlers = {
  onMapClick: (event: MapMouseEvent) => void
  onSelectedTrackpointClick: (index: number) => void
}

// Layers are added in paint order — each track's line sits below its points,
// which sit below its touch target — so the sequence here is load-bearing.
export function registerGrazingSessionMapSetup(
  map: MapLibreMap,
  handlers: GrazingSessionMapSetupHandlers
) {
  const eventColors = mapStyleColors.sessionEvent

  addOrthophotoLayer(map)
  addSurveyAreaLayers(map)

  addGeoJsonSource(map, 'session-events')
  // The only data-driven layer on either map: one marker colour per event type.
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
  addPathLineLayer(map, {
    id: 'current-session-track-line',
    source: 'current-session-track',
    color: mapStyleColors.currentSessionTrack,
    width: 4,
    filterGeometry: true,
  })
  addPathPointLayer(map, {
    id: 'current-session-track-points',
    source: 'current-session-track',
    color: mapStyleColors.currentSessionTrack,
    radius: 4,
    strokeWidth: 2,
  })

  addGeoJsonSource(map, 'selected-session-track')
  addPathLineLayer(map, {
    id: 'selected-session-track-line',
    source: 'selected-session-track',
    color: mapStyleColors.selectedSessionTrack,
    width: 4,
    filterGeometry: true,
  })
  addPathPointLayer(map, {
    id: 'selected-session-track-points',
    source: 'selected-session-track',
    color: mapStyleColors.selectedSessionTrack,
    radius: 7,
    strokeWidth: 3,
  })
  addTouchTargetLayer(map, {
    id: 'selected-session-track-touch-target',
    source: 'selected-session-track',
  })

  map.on('click', handlers.onMapClick)

  // `seq`, not `index`: this source also carries the recorded track, whose
  // points are numbered by their stored sequence.
  bindPointIndexClick(
    map,
    'selected-session-track-touch-target',
    'seq',
    handlers.onSelectedTrackpointClick
  )

  bindPointerCursor(map, ['selected-session-track-touch-target'])
}
