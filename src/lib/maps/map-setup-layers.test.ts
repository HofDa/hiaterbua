import { describe, expect, it, vi } from 'vitest'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { registerGrazingSessionMapSetup } from '@/lib/maps/grazing-session-map-setup'
import { registerLivePositionMapSetup } from '@/lib/maps/live-position-map-setup'

type LayerSpec = {
  id: string
  type: string
  source: string
  paint?: Record<string, unknown>
  filter?: unknown
}

/**
 * Records what a setup function asks of MapLibre. Layer order is paint order, so
 * the recorded sequence is the thing worth asserting: a fill added after its
 * points would hide them, and a touch target added before its points would never
 * receive the tap.
 */
function recordingMap() {
  const layers: LayerSpec[] = []
  const sources: string[] = []
  const clickLayers: string[] = []

  const map = {
    addSource: (id: string) => {
      sources.push(id)
    },
    addLayer: (spec: LayerSpec) => {
      layers.push(spec)
    },
    on: (event: string, layerIdOrHandler?: unknown) => {
      if (event === 'click') {
        clickLayers.push(
          typeof layerIdOrHandler === 'string' ? layerIdOrHandler : '(map)'
        )
      }
    },
    getCanvas: () => ({ style: {} }),
  } as unknown as MapLibreMap

  return { map, layers, sources, clickLayers }
}

describe('live-position map setup', () => {
  const setup = () => {
    const recorder = recordingMap()
    registerLivePositionMapSetup(recorder.map, {
      onMapClick: vi.fn(),
      onSavedEnclosureSelect: vi.fn(),
      onSelectedEnclosureSelect: vi.fn(),
      onWalkPointSelect: vi.fn(),
      onEditPointSelect: vi.fn(),
    })
    return recorder
  }

  it('registers every layer in paint order', () => {
    expect(setup().layers.map((layer) => layer.id)).toEqual([
      'south-tyrol-orthophoto-2023',
      'survey-areas-fill',
      'survey-areas-line',
      'saved-enclosures-fill',
      'saved-enclosures-line',
      'selected-enclosure-fill',
      'selected-enclosure-line',
      'draft-enclosure-fill',
      'draft-enclosure-line',
      'draft-enclosure-points',
      'edit-enclosure-fill',
      'edit-enclosure-line',
      'edit-enclosure-points',
      'edit-enclosure-touch-target',
      'walk-track-fill',
      'walk-track-line',
      'walk-track-points',
      'selected-walk-point',
      'selected-walk-track-line',
      'selected-walk-track-points',
    ])
  })

  it('binds clicks to the map and to the four interactive layers', () => {
    expect(setup().clickLayers).toEqual([
      '(map)',
      'saved-enclosures-fill',
      'selected-enclosure-fill',
      'walk-track-points',
      'edit-enclosure-touch-target',
    ])
  })

  it('restricts each multi-geometry source layer to its own geometry', () => {
    const byId = new Map(setup().layers.map((layer) => [layer.id, layer]))

    // These sources carry a polygon, a line and points together.
    expect(byId.get('draft-enclosure-fill')?.filter).toEqual(['==', '$type', 'Polygon'])
    expect(byId.get('draft-enclosure-line')?.filter).toEqual(['==', '$type', 'LineString'])
    expect(byId.get('draft-enclosure-points')?.filter).toEqual(['==', '$type', 'Point'])

    // Saved enclosures are polygons only, so their layers stay unfiltered.
    expect(byId.get('saved-enclosures-fill')?.filter).toBeUndefined()
    expect(byId.get('saved-enclosures-line')?.filter).toBeUndefined()
  })

  it('keeps the invisible touch target above the points it widens', () => {
    const layers = setup().layers
    const points = layers.findIndex((layer) => layer.id === 'edit-enclosure-points')
    const target = layers.findIndex((layer) => layer.id === 'edit-enclosure-touch-target')

    expect(target).toBeGreaterThan(points)
    expect(layers[target].paint?.['circle-opacity']).toBe(0.01)
    expect(layers[target].paint?.['circle-radius']).toBe(18)
  })
})

describe('grazing-session map setup', () => {
  const setup = () => {
    const recorder = recordingMap()
    registerGrazingSessionMapSetup(recorder.map, {
      onMapClick: vi.fn(),
      onSelectedTrackpointClick: vi.fn(),
    })
    return recorder
  }

  it('registers every layer in paint order', () => {
    expect(setup().layers.map((layer) => layer.id)).toEqual([
      'south-tyrol-orthophoto-2023',
      'survey-areas-fill',
      'survey-areas-line',
      'session-events-points',
      'current-session-track-line',
      'current-session-track-points',
      'selected-session-track-line',
      'selected-session-track-points',
      'selected-session-track-touch-target',
    ])
  })

  it('binds clicks to the map and the track touch target', () => {
    expect(setup().clickLayers).toEqual(['(map)', 'selected-session-track-touch-target'])
  })

  it('colours session-event markers by event type', () => {
    const eventLayer = setup().layers.find((layer) => layer.id === 'session-events-points')
    const circleColor = eventLayer?.paint?.['circle-color'] as unknown[]

    expect(circleColor[0]).toBe('match')
    expect(circleColor[1]).toEqual(['get', 'type'])
  })
})
