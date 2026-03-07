'use client'

import { area as turfArea } from '@turf/turf'
import type * as GeoJSON from 'geojson'
import JSZip from 'jszip'
import { useMemo, useState } from 'react'
import { db } from '@/lib/db/dexie'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type {
  Animal,
  AppSettings,
  Enclosure,
  EnclosureAssignment,
  GrazingSession,
  Herd,
  SessionEvent,
  SurveyArea,
  TrackPoint,
  WorkEvent,
  WorkSession,
} from '@/types/domain'

type ImportPayload = {
  herds?: Herd[]
  animals?: Animal[]
  enclosures?: Enclosure[]
  surveyAreas?: SurveyArea[]
  enclosureAssignments?: EnclosureAssignment[]
  grazingSessions?: GrazingSession[]
  trackpoints?: TrackPoint[]
  sessionEvents?: SessionEvent[]
  workSessions?: WorkSession[]
  workEvents?: WorkEvent[]
  settings?: AppSettings[]
}

type ImportPreview = {
  sourceLabel: string
  payload: ImportPayload
  counts: {
    herds: number
    animals: number
    enclosures: number
    surveyAreas: number
    enclosureAssignments: number
    grazingSessions: number
    trackpoints: number
    sessionEvents: number
    workSessions: number
    workEvents: number
    settings: number
  }
  warnings: string[]
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function buildFeatureCollection(
  features: GeoJSON.Feature[]
): GeoJSON.FeatureCollection<GeoJSON.Geometry, GeoJSON.GeoJsonProperties> {
  return {
    type: 'FeatureCollection',
    features,
  }
}

function hasGeometry(
  enclosure: Enclosure
): enclosure is Enclosure & {
  geometry: GeoJSON.Polygon
} {
  return enclosure.geometry !== null
}

function hasPolygonGeometry(
  feature: GeoJSON.Feature
): feature is GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> {
  return (
    feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon'
  )
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function buildGpxTrack(
  name: string,
  segments: Array<{
    name: string
    points: Array<{ lat: number; lon: number; timestamp: string }>
  }>
) {
  const tracksXml = segments
    .filter((segment) => segment.points.length > 0)
    .map((segment) => {
      const pointsXml = segment.points
        .map(
          (point) =>
            `<trkpt lat="${point.lat}" lon="${point.lon}"><time>${escapeXml(point.timestamp)}</time></trkpt>`
        )
        .join('')

      return `<trk><name>${escapeXml(segment.name)}</name><trkseg>${pointsXml}</trkseg></trk>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Hiaterbua 1.0" xmlns="http://www.topografix.com/GPX/1/1">
<metadata><name>${escapeXml(name)}</name></metadata>
${tracksXml}
</gpx>`
}

function getAreaMetrics(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon) {
  const areaM2 = turfArea({
    type: 'Feature',
    geometry,
    properties: {},
  })

  return {
    areaM2,
    areaHa: areaM2 / 10_000,
  }
}

function getArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function getImportCounts(payload: ImportPayload) {
  return {
    herds: getArray<Herd>(payload.herds).length,
    animals: getArray<Animal>(payload.animals).length,
    enclosures: getArray<Enclosure>(payload.enclosures).length,
    surveyAreas: getArray<SurveyArea>(payload.surveyAreas).length,
    enclosureAssignments: getArray<EnclosureAssignment>(payload.enclosureAssignments).length,
    grazingSessions: getArray<GrazingSession>(payload.grazingSessions).length,
    trackpoints: getArray<TrackPoint>(payload.trackpoints).length,
    sessionEvents: getArray<SessionEvent>(payload.sessionEvents).length,
    workSessions: getArray<WorkSession>(payload.workSessions).length,
    workEvents: getArray<WorkEvent>(payload.workEvents).length,
    settings: getArray<AppSettings>(payload.settings).length,
  }
}

function buildSurveyAreasFromGeoJson(
  content: string,
  fallbackName: string
): SurveyArea[] {
  const parsed = JSON.parse(content) as GeoJSON.GeoJSON

  if (parsed.type !== 'FeatureCollection') {
    throw new Error('Untersuchungsflächen-GeoJSON muss eine FeatureCollection sein.')
  }

  const importedAt = nowIso()

  return parsed.features
    .filter(hasPolygonGeometry)
    .map((feature, index) => {
      const properties = feature.properties ?? {}
      const geometry = feature.geometry
      const metrics = getAreaMetrics(geometry)
      const rawName =
        typeof properties.name === 'string' && properties.name.trim().length > 0
          ? properties.name
          : typeof properties.title === 'string' && properties.title.trim().length > 0
            ? properties.title
            : `${fallbackName} ${index + 1}`

      return {
        id:
          typeof properties.id === 'string' && properties.id.trim().length > 0
            ? properties.id
            : createId('survey'),
        name: rawName,
        geometry,
        notes:
          typeof properties.notes === 'string'
            ? properties.notes
            : typeof properties.description === 'string'
              ? properties.description
              : undefined,
        areaM2: metrics.areaM2,
        areaHa: metrics.areaHa,
        createdAt:
          typeof properties.createdAt === 'string' ? properties.createdAt : importedAt,
        updatedAt:
          typeof properties.updatedAt === 'string' ? properties.updatedAt : importedAt,
      }
    })
}

async function importPayloadIntoDb(payload: ImportPayload, replaceExisting: boolean) {
  const herds = getArray<Herd>(payload.herds)
  const animals = getArray<Animal>(payload.animals)
  const enclosures = getArray<Enclosure>(payload.enclosures)
  const surveyAreas = getArray<SurveyArea>(payload.surveyAreas)
  const enclosureAssignments = getArray<EnclosureAssignment>(payload.enclosureAssignments)
  const grazingSessions = getArray<GrazingSession>(payload.grazingSessions)
  const trackpoints = getArray<TrackPoint>(payload.trackpoints)
  const sessionEvents = getArray<SessionEvent>(payload.sessionEvents)
  const workSessions = getArray<WorkSession>(payload.workSessions)
  const workEvents = getArray<WorkEvent>(payload.workEvents)
  const settings = getArray<AppSettings>(payload.settings)

  await db.transaction(
    'rw',
    [
      db.herds,
      db.animals,
      db.enclosures,
      db.surveyAreas,
      db.enclosureAssignments,
      db.sessions,
      db.trackpoints,
      db.events,
      db.workSessions,
      db.workEvents,
      db.settings,
    ],
    async () => {
      if (replaceExisting) {
        await Promise.all([
          db.herds.clear(),
          db.animals.clear(),
          db.enclosures.clear(),
          db.surveyAreas.clear(),
          db.enclosureAssignments.clear(),
          db.sessions.clear(),
          db.trackpoints.clear(),
          db.events.clear(),
          db.workSessions.clear(),
          db.workEvents.clear(),
          db.settings.clear(),
        ])
      }

      if (herds.length > 0) await db.herds.bulkPut(herds)
      if (animals.length > 0) await db.animals.bulkPut(animals)
      if (enclosures.length > 0) await db.enclosures.bulkPut(enclosures)
      if (surveyAreas.length > 0) await db.surveyAreas.bulkPut(surveyAreas)
      if (enclosureAssignments.length > 0) {
        await db.enclosureAssignments.bulkPut(enclosureAssignments)
      }
      if (grazingSessions.length > 0) await db.sessions.bulkPut(grazingSessions)
      if (trackpoints.length > 0) await db.trackpoints.bulkPut(trackpoints)
      if (sessionEvents.length > 0) await db.events.bulkPut(sessionEvents)
      if (workSessions.length > 0) await db.workSessions.bulkPut(workSessions)
      if (workEvents.length > 0) await db.workEvents.bulkPut(workEvents)
      if (settings.length > 0) await db.settings.bulkPut(settings)
    }
  )

  return {
    herds: herds.length,
    animals: animals.length,
    enclosures: enclosures.length,
    surveyAreas: surveyAreas.length,
    grazingSessions: grazingSessions.length,
    trackpoints: trackpoints.length,
  }
}

async function buildImportPreview(file: File): Promise<ImportPreview> {
  const fileName = file.name.toLowerCase()

  if (fileName.endsWith('.zip')) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer())
    const appDataEntry = zip.file('app-data.json')
    const surveyAreasEntry =
      zip.file('spatial/survey_areas.geojson') ??
      zip.file('survey_areas.geojson')

    let payload: ImportPayload = {}
    const warnings: string[] = []

    if (appDataEntry) {
      payload = JSON.parse(await appDataEntry.async('string')) as ImportPayload
    } else {
      warnings.push('ZIP enthält keine `app-data.json`.')
    }

    if (surveyAreasEntry) {
      const importedSurveyAreas = buildSurveyAreasFromGeoJson(
        await surveyAreasEntry.async('string'),
        'Untersuchungsfläche'
      )
      payload.surveyAreas = importedSurveyAreas
    }

    return {
      sourceLabel: 'ZIP-Export',
      payload,
      counts: getImportCounts(payload),
      warnings,
    }
  }

  if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
    const content = await file.text()
    const parsed = JSON.parse(content) as Record<string, unknown>

    const looksLikeAppData =
      Array.isArray(parsed.herds) ||
      Array.isArray(parsed.enclosures) ||
      Array.isArray(parsed.grazingSessions) ||
      Array.isArray(parsed.trackpoints) ||
      Array.isArray(parsed.workSessions)

    if (looksLikeAppData) {
      const payload = parsed as ImportPayload

      return {
        sourceLabel: 'App-Daten JSON',
        payload,
        counts: getImportCounts(payload),
        warnings: [],
      }
    }

    const surveyAreas = buildSurveyAreasFromGeoJson(content, 'Untersuchungsfläche')
    const payload = { surveyAreas }

    return {
      sourceLabel: 'Untersuchungsflächen GeoJSON',
      payload,
      counts: getImportCounts(payload),
      warnings: [],
    }
  }

  throw new Error('Unterstützt werden ZIP, JSON und GeoJSON.')
}

export default function ExportPage() {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [replaceExisting, setReplaceExisting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [isAnalyzingImport, setIsAnalyzingImport] = useState(false)

  const selectedFileLabel = useMemo(() => {
    if (!selectedFile) return 'Keine Datei gewählt.'
    return `${selectedFile.name} (${Math.round(selectedFile.size / 1024)} KB)`
  }, [selectedFile])

  async function handleExportZip() {
    setIsExporting(true)
    setStatus('')
    setError('')

    try {
      const [
        herds,
        animals,
        enclosures,
        surveyAreas,
        enclosureAssignments,
        sessions,
        trackpoints,
        events,
        workSessions,
        workEvents,
        settings,
      ] = await Promise.all([
        db.herds.toArray(),
        db.animals.toArray(),
        db.enclosures.toArray(),
        db.surveyAreas.toArray(),
        db.enclosureAssignments.toArray(),
        db.sessions.toArray(),
        db.trackpoints.toArray(),
        db.events.toArray(),
        db.workSessions.toArray(),
        db.workEvents.toArray(),
        db.settings.toArray(),
      ])

      const trackpointsBySessionId = new Map<string, typeof trackpoints>()
      const trackpointsByEnclosureWalkId = new Map<string, typeof trackpoints>()
      const sessionsById = new Map(sessions.map((session) => [session.id, session]))

      trackpoints.forEach((trackpoint) => {
        if (trackpoint.sessionId) {
          const current = trackpointsBySessionId.get(trackpoint.sessionId) ?? []
          current.push(trackpoint)
          trackpointsBySessionId.set(trackpoint.sessionId, current)
        }

        if (trackpoint.enclosureWalkId) {
          const current = trackpointsByEnclosureWalkId.get(trackpoint.enclosureWalkId) ?? []
          current.push(trackpoint)
          trackpointsByEnclosureWalkId.set(trackpoint.enclosureWalkId, current)
        }
      })

      const enclosureFeatures: GeoJSON.Feature<GeoJSON.Polygon>[] = enclosures
        .filter(hasGeometry)
        .map((enclosure) => ({
          type: 'Feature',
          geometry: enclosure.geometry,
          properties: {
            id: enclosure.id,
            name: enclosure.name,
            method: enclosure.method,
            areaM2: enclosure.areaM2,
            areaHa: enclosure.areaHa,
            herdId: enclosure.herdId ?? null,
            notes: enclosure.notes ?? null,
            avgAccuracyM: enclosure.avgAccuracyM ?? null,
            pointsCount: enclosure.pointsCount ?? null,
            createdAt: enclosure.createdAt,
            updatedAt: enclosure.updatedAt,
          },
        }))

      const surveyAreaFeatures: GeoJSON.Feature<
        GeoJSON.Polygon | GeoJSON.MultiPolygon
      >[] = surveyAreas.map((surveyArea) => ({
        type: 'Feature',
        geometry: surveyArea.geometry,
        properties: {
          id: surveyArea.id,
          name: surveyArea.name,
          notes: surveyArea.notes ?? null,
          areaM2: surveyArea.areaM2,
          areaHa: surveyArea.areaHa,
          createdAt: surveyArea.createdAt,
          updatedAt: surveyArea.updatedAt,
        },
      }))

      const grazingSessionFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = sessions
        .flatMap((session) => {
          const points = (trackpointsBySessionId.get(session.id) ?? [])
            .filter((point) => point.accepted)
            .sort((left, right) => left.seq - right.seq)

          if (points.length < 2) return []

          return [
            {
              type: 'Feature' as const,
              geometry: {
                type: 'LineString' as const,
                coordinates: points.map((point) => [point.lon, point.lat]),
              },
              properties: {
                id: session.id,
                herdId: session.herdId,
                status: session.status,
                startTime: session.startTime,
                endTime: session.endTime ?? null,
                durationS: session.durationS,
                movingTimeS: session.movingTimeS,
                distanceM: session.distanceM,
                avgSpeedMps: session.avgSpeedMps ?? null,
                avgAccuracyM: session.avgAccuracyM ?? null,
                notes: session.notes ?? null,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
              },
            },
          ]
        })

      const grazingTrackpointFeatures: GeoJSON.Feature<GeoJSON.Point>[] = trackpoints
        .filter((point) => point.sessionId)
        .map((point) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [point.lon, point.lat],
          },
          properties: {
            id: point.id,
            sessionId: point.sessionId ?? null,
            enclosureWalkId: point.enclosureWalkId ?? null,
            seq: point.seq,
            timestamp: point.timestamp,
            accuracyM: point.accuracyM ?? null,
            speedMps: point.speedMps ?? null,
            headingDeg: point.headingDeg ?? null,
            accepted: point.accepted,
          },
        }))

      const enclosureWalkTrackpointFeatures: GeoJSON.Feature<GeoJSON.Point>[] = trackpoints
        .filter((point) => point.enclosureWalkId)
        .map((point) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [point.lon, point.lat],
          },
          properties: {
            id: point.id,
            sessionId: point.sessionId ?? null,
            enclosureWalkId: point.enclosureWalkId ?? null,
            seq: point.seq,
            timestamp: point.timestamp,
            accuracyM: point.accuracyM ?? null,
            speedMps: point.speedMps ?? null,
            headingDeg: point.headingDeg ?? null,
            accepted: point.accepted,
          },
        }))

      const sessionEventFeatures: GeoJSON.Feature<GeoJSON.Point>[] = events
        .filter(
          (event): event is SessionEvent & { lat: number; lon: number } =>
            typeof event.lat === 'number' && typeof event.lon === 'number'
        )
        .map((event) => {
          const session = sessionsById.get(event.sessionId)

          return {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [event.lon, event.lat],
            },
            properties: {
              id: event.id,
              sessionId: event.sessionId,
              herdId: session?.herdId ?? null,
              sessionStatus: session?.status ?? null,
              type: event.type,
              timestamp: event.timestamp,
              comment: event.comment ?? null,
            },
          }
        })

      const appData = {
        exportedAt: new Date().toISOString(),
        app: 'Hiaterbua 1.0',
        herds,
        animals,
        enclosures,
        surveyAreas,
        enclosureAssignments,
        grazingSessions: sessions,
        trackpoints,
        sessionEvents: events,
        workSessions,
        workEvents,
        settings,
      }

      const grazingGpx = buildGpxTrack(
        'Hiaterbua 1.0 Weidegänge',
        sessions.map((session) => ({
          name: `Weidegang ${session.id}`,
          points: (trackpointsBySessionId.get(session.id) ?? [])
            .filter((point) => point.accepted)
            .sort((left, right) => left.seq - right.seq)
            .map((point) => ({
              lat: point.lat,
              lon: point.lon,
              timestamp: point.timestamp,
            })),
        }))
      )

      const enclosureWalkGpx = buildGpxTrack(
        'Hiaterbua 1.0 Pferch-Walks',
        enclosures
          .filter((enclosure) => enclosure.method === 'walk')
          .map((enclosure) => ({
            name: enclosure.name,
            points: (trackpointsByEnclosureWalkId.get(enclosure.id) ?? [])
              .filter((point) => point.accepted)
              .sort((left, right) => left.seq - right.seq)
              .map((point) => ({
                lat: point.lat,
                lon: point.lon,
                timestamp: point.timestamp,
              })),
          }))
      )

      const zip = new JSZip()
      zip.file('README.txt', [
        'Hiaterbua 1.0 Export',
        '',
        'spatial/enclosures.geojson: Pferche als Polygone',
        'spatial/survey_areas.geojson: Untersuchungsflächen als Polygone',
        'spatial/grazing_sessions.geojson: Geführte Weidegänge als Linien',
        'spatial/grazing_trackpoints.geojson: Trackpunkte der Weidegänge',
        'spatial/session_events.geojson: Ereignisse der Weidegänge als Punkte',
        'spatial/enclosure_walk_trackpoints.geojson: Trackpunkte der abgelaufenen Pferche',
        'gpx/grazing_sessions.gpx: Weidegänge als GPX',
        'gpx/enclosure_walks.gpx: Pferch-Walks als GPX',
        'app-data.json: übrige App-Daten für Import/Archiv',
        '',
        'GeoPackage ist aktuell noch nicht enthalten.',
      ].join('\n'))
      zip.file('app-data.json', JSON.stringify(appData, null, 2))
      zip.file(
        'spatial/enclosures.geojson',
        JSON.stringify(buildFeatureCollection(enclosureFeatures), null, 2)
      )
      zip.file(
        'spatial/survey_areas.geojson',
        JSON.stringify(buildFeatureCollection(surveyAreaFeatures), null, 2)
      )
      zip.file(
        'spatial/grazing_sessions.geojson',
        JSON.stringify(buildFeatureCollection(grazingSessionFeatures), null, 2)
      )
      zip.file(
        'spatial/grazing_trackpoints.geojson',
        JSON.stringify(buildFeatureCollection(grazingTrackpointFeatures), null, 2)
      )
      zip.file(
        'spatial/session_events.geojson',
        JSON.stringify(buildFeatureCollection(sessionEventFeatures), null, 2)
      )
      zip.file(
        'spatial/enclosure_walk_trackpoints.geojson',
        JSON.stringify(buildFeatureCollection(enclosureWalkTrackpointFeatures), null, 2)
      )
      zip.file('gpx/grazing_sessions.gpx', grazingGpx)
      zip.file('gpx/enclosure_walks.gpx', enclosureWalkGpx)

      const blob = await zip.generateAsync({ type: 'blob' })
      downloadBlob(blob, `hiaterbua-1.0-export-${new Date().toISOString().slice(0, 10)}.zip`)
      setStatus('ZIP-Export erstellt.')
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Export konnte nicht erstellt werden.'
      )
    } finally {
      setIsExporting(false)
    }
  }

  async function handleImport() {
    if (!selectedFile || !importPreview) {
      setError('Bitte zuerst eine Importdatei wählen.')
      return
    }

    setIsImporting(true)
    setStatus('')
    setError('')

    try {
      const counts = await importPayloadIntoDb(importPreview.payload, replaceExisting)
      setStatus(
        `Import abgeschlossen (${replaceExisting ? 'Ersetzen' : 'Zusammenführen'}). Herden: ${counts.herds}, Pferche: ${counts.enclosures}, Untersuchungsflächen: ${counts.surveyAreas}, Weidegänge: ${counts.grazingSessions}, Trackpunkte: ${counts.trackpoints}.`
      )
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Import konnte nicht durchgeführt werden.'
      )
    } finally {
      setIsImporting(false)
    }
  }

  async function handleFileSelection(file: File | null) {
    setSelectedFile(file)
    setImportPreview(null)
    setStatus('')
    setError('')

    if (!file) {
      return
    }

    setIsAnalyzingImport(true)

    try {
      const preview = await buildImportPreview(file)
      setImportPreview(preview)
      setStatus(`Import-Datei geprüft: ${preview.sourceLabel}.`)
    } catch (currentError) {
      setImportPreview(null)
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Datei konnte nicht analysiert werden.'
      )
    } finally {
      setIsAnalyzingImport(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">Export & Import</h1>
        <p className="mt-2 text-sm text-neutral-600">
          QGIS-taugliche Raumdaten als GeoJSON, Spuren zusätzlich als GPX und übrige App-Daten als JSON bündeln oder wieder einlesen.
        </p>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">ZIP-Export</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Enthält Pferche, Untersuchungsflächen, geführte Weidegänge, Trackpunkte, GPX-Dateien und `app-data.json` für Herden, Tiere, Arbeit und Einstellungen.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-neutral-50 px-4 py-4 text-sm text-neutral-700">
            <div className="font-medium text-neutral-900">Für QGIS</div>
            <div className="mt-2">`enclosures.geojson`</div>
            <div>`survey_areas.geojson`</div>
            <div>`grazing_sessions.geojson`</div>
            <div>`grazing_trackpoints.geojson`</div>
            <div>`session_events.geojson`</div>
            <div>`enclosure_walk_trackpoints.geojson`</div>
          </div>
          <div className="rounded-2xl bg-neutral-50 px-4 py-4 text-sm text-neutral-700">
            <div className="font-medium text-neutral-900">Weitere Dateien</div>
            <div className="mt-2">`grazing_sessions.gpx`</div>
            <div>`enclosure_walks.gpx`</div>
            <div>`app-data.json`</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleExportZip()}
          disabled={isExporting}
          className="mt-4 rounded-2xl bg-black px-4 py-4 font-medium text-white disabled:opacity-50"
        >
          {isExporting ? 'Erstellt Export ...' : 'ZIP-Export herunterladen'}
        </button>

        <p className="mt-3 text-xs text-neutral-500">
          GeoPackage ist bewusst noch nicht enthalten, weil im Projekt aktuell keine Schreibbibliothek dafür integriert ist.
        </p>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Import</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Importiert `app-data.json`, den gesamten ZIP-Export oder ein separates GeoJSON für Untersuchungsflächen.
        </p>

        <label className="mt-4 block rounded-2xl border border-dashed border-neutral-300 px-4 py-4 text-sm text-neutral-700">
          <div className="font-medium text-neutral-900">Datei wählen</div>
          <div className="mt-1 text-neutral-600">{selectedFileLabel}</div>
          <input
            type="file"
            accept=".zip,.json,.geojson,application/json,application/geo+json,application/zip"
            className="mt-3 block w-full text-sm"
            onChange={(event) => {
              void handleFileSelection(event.target.files?.[0] ?? null)
            }}
          />
        </label>

        {isAnalyzingImport ? (
          <div className="mt-4 rounded-2xl bg-stone-100 px-4 py-3 text-sm text-neutral-800">
            Analysiere Importdatei ...
          </div>
        ) : null}

        {importPreview ? (
          <div className="mt-4 rounded-2xl bg-stone-50 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-neutral-950">Importübersicht</div>
                <div className="mt-1 text-sm text-neutral-700">{importPreview.sourceLabel}</div>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-900">
                {replaceExisting ? 'Ersetzen' : 'Zusammenführen'}
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Herden', importPreview.counts.herds],
                ['Tiere', importPreview.counts.animals],
                ['Pferche', importPreview.counts.enclosures],
                ['Untersuchungsflächen', importPreview.counts.surveyAreas],
                ['Belegungen', importPreview.counts.enclosureAssignments],
                ['Weidegänge', importPreview.counts.grazingSessions],
                ['Trackpunkte', importPreview.counts.trackpoints],
                ['Ereignisse', importPreview.counts.sessionEvents],
                ['Arbeit', importPreview.counts.workSessions],
                ['Arbeitsereignisse', importPreview.counts.workEvents],
                ['Settings', importPreview.counts.settings],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-2xl border border-white bg-white px-3 py-3 text-sm text-neutral-800"
                >
                  <div className="text-neutral-600">{label}</div>
                  <div className="mt-1 font-semibold text-neutral-950">{value}</div>
                </div>
              ))}
            </div>

            {importPreview.warnings.length > 0 ? (
              <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {importPreview.warnings.map((warning) => (
                  <div key={warning}>{warning}</div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <label className="mt-4 flex items-start gap-3 rounded-2xl bg-neutral-50 px-4 py-4 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={replaceExisting}
            onChange={(event) => setReplaceExisting(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-neutral-300"
          />
          <span>
            <span className="block font-medium text-neutral-900">Vorhandene Daten vorher löschen</span>
            <span className="block text-neutral-600">
              Ohne Haken werden Datensätze anhand ihrer `id` ergänzt oder überschrieben.
            </span>
          </span>
        </label>

        <button
          type="button"
          onClick={() => void handleImport()}
          disabled={isImporting || isAnalyzingImport || !selectedFile || !importPreview}
          className="mt-4 rounded-2xl bg-neutral-900 px-4 py-4 font-medium text-white disabled:opacity-50"
        >
          {isImporting ? 'Import läuft ...' : 'Import starten'}
        </button>
      </section>

      {status ? (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {status}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  )
}
