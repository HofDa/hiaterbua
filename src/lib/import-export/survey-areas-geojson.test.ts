import { describe, expect, it } from 'vitest'
import { buildSurveyAreasFromGeoJson } from '@/lib/import-export/file-formats'

const SQUARE = [
  [
    [11.0, 46.5],
    [11.001, 46.5],
    [11.001, 46.501],
    [11.0, 46.501],
    [11.0, 46.5],
  ],
]

function polygonFeature(properties: Record<string, unknown> = {}) {
  return {
    type: 'Feature',
    properties,
    geometry: { type: 'Polygon', coordinates: SQUARE },
  }
}

function featureCollection(features: unknown[]) {
  return JSON.stringify({ type: 'FeatureCollection', features })
}

describe('buildSurveyAreasFromGeoJson', () => {
  it('throws when the GeoJSON is not a FeatureCollection', () => {
    expect(() =>
      buildSurveyAreasFromGeoJson(
        JSON.stringify({ type: 'Polygon', coordinates: SQUARE }),
        'Fläche',
      ),
    ).toThrow(/FeatureCollection/)
  })

  it('keeps polygon and multipolygon features and drops the rest', () => {
    const content = featureCollection([
      polygonFeature({ name: 'Erste' }),
      {
        type: 'Feature',
        properties: { name: 'Punkt' },
        geometry: { type: 'Point', coordinates: [11.0, 46.5] },
      },
      {
        type: 'Feature',
        properties: { name: 'Multi' },
        geometry: { type: 'MultiPolygon', coordinates: [SQUARE] },
      },
    ])

    const result = buildSurveyAreasFromGeoJson(content, 'Fläche')

    expect(result).toHaveLength(2)
    expect(result.map((area) => area.name)).toEqual(['Erste', 'Multi'])
    expect(result.map((area) => area.geometry.type)).toEqual(['Polygon', 'MultiPolygon'])
    // importOrder reindexes over the kept features, not the original positions.
    expect(result.map((area) => area.importOrder)).toEqual([0, 1])
  })

  it('computes positive areas with hectares derived from square metres', () => {
    const [area] = buildSurveyAreasFromGeoJson(featureCollection([polygonFeature()]), 'Fläche')

    expect(area.areaM2).toBeGreaterThan(0)
    expect(area.areaHa).toBeCloseTo(area.areaM2 / 10_000)
  })

  it('resolves the name as name → title → fallback', () => {
    const content = featureCollection([
      polygonFeature({ name: 'Echter Name', title: 'Titel' }),
      polygonFeature({ title: 'Nur Titel' }),
      polygonFeature({ name: '   ' }),
    ])

    const result = buildSurveyAreasFromGeoJson(content, 'Fläche')

    expect(result.map((area) => area.name)).toEqual(['Echter Name', 'Nur Titel', 'Fläche 3'])
  })

  it('keeps a provided id but generates one when missing or blank', () => {
    const content = featureCollection([
      polygonFeature({ id: 'survey_provided' }),
      polygonFeature({ id: '   ' }),
    ])

    const [withId, withoutId] = buildSurveyAreasFromGeoJson(content, 'Fläche')

    expect(withId.id).toBe('survey_provided')
    expect(withoutId.id).toMatch(/^survey_/)
    expect(withoutId.id).not.toBe('survey_provided')
  })

  it('resolves notes as notes → description → undefined', () => {
    const content = featureCollection([
      polygonFeature({ notes: 'Notiz' }),
      polygonFeature({ description: 'Beschreibung' }),
      polygonFeature({}),
    ])

    const result = buildSurveyAreasFromGeoJson(content, 'Fläche')

    expect(result.map((area) => area.notes)).toEqual(['Notiz', 'Beschreibung', undefined])
  })

  it('preserves timestamps from properties and fills them in otherwise', () => {
    const content = featureCollection([
      polygonFeature({ createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z' }),
      polygonFeature({}),
    ])

    const [provided, generated] = buildSurveyAreasFromGeoJson(content, 'Fläche')

    expect(provided.createdAt).toBe('2026-01-01T00:00:00.000Z')
    expect(provided.updatedAt).toBe('2026-02-01T00:00:00.000Z')
    expect(Number.isNaN(Date.parse(generated.createdAt))).toBe(false)
    // A missing pair is filled from a single import timestamp, so they match.
    expect(generated.createdAt).toBe(generated.updatedAt)
  })
})
