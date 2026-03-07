'use client'

import { area as turfArea } from '@turf/turf'
import type * as GeoJSON from 'geojson'
import JSZip from 'jszip'
import { useEffect, useMemo, useState } from 'react'
import { db } from '@/lib/db/dexie'
import {
  type ExistingImportRefs,
  getImportCounts,
  getPresentImportPayloadKeys,
  isCompleteAppDataPayload,
  parseImportPayload,
  prepareImportPayload,
  type ImportSourceKind,
  type ImportPayload,
  type ImportPreviewMeta,
  type PreparedImportPayload,
} from '@/lib/import-export/import-validation'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type {
  Animal,
  EnclosureAssignment,
  GrazingSession,
  Herd,
  Enclosure,
  SessionEvent,
  SurveyArea,
  TrackPoint,
  WorkEvent,
  WorkSession,
} from '@/types/domain'

type ImportPreview = {
  sourceLabel: string
  meta: ImportPreviewMeta
  payload: ImportPayload
  counts: ReturnType<typeof getImportCounts>
  warnings: string[]
}

type HerdExportBundle = {
  herd: Herd
  summary: {
    animals: number
    activeAnimals: number
    enclosures: number
    activeAssignments: number
    allAssignments: number
    grazingSessions: number
    grazingTrackpoints: number
    grazingEvents: number
    workSessions: number
    workEvents: number
  }
  animals: Animal[]
  enclosures: Enclosure[]
  enclosureAssignments: EnclosureAssignment[]
  grazingSessions: Array<{
    session: GrazingSession
    trackpoints: TrackPoint[]
    events: SessionEvent[]
  }>
  workSessions: Array<{
    session: WorkSession
    events: WorkEvent[]
  }>
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function sanitizeFilenamePart(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized.length > 0 ? normalized : 'herde'
}

function buildFeatureCollection(
  features: GeoJSON.Feature[]
): GeoJSON.FeatureCollection<GeoJSON.Geometry, GeoJSON.GeoJsonProperties> {
  return {
    type: 'FeatureCollection',
    features,
  }
}

function buildHerdExportBundles(input: {
  herds: Herd[]
  animals: Animal[]
  enclosures: Enclosure[]
  enclosureAssignments: EnclosureAssignment[]
  sessions: GrazingSession[]
  trackpoints: TrackPoint[]
  events: SessionEvent[]
  workSessions: WorkSession[]
  workEvents: WorkEvent[]
}) {
  const {
    herds,
    animals,
    enclosures,
    enclosureAssignments,
    sessions,
    trackpoints,
    events,
    workSessions,
    workEvents,
  } = input

  const trackpointsBySessionId = new Map<string, TrackPoint[]>()
  const eventsBySessionId = new Map<string, SessionEvent[]>()
  const workEventsBySessionId = new Map<string, WorkEvent[]>()

  trackpoints.forEach((point) => {
    if (!point.sessionId) return
    const current = trackpointsBySessionId.get(point.sessionId) ?? []
    current.push(point)
    trackpointsBySessionId.set(point.sessionId, current)
  })

  events.forEach((event) => {
    const current = eventsBySessionId.get(event.sessionId) ?? []
    current.push(event)
    eventsBySessionId.set(event.sessionId, current)
  })

  workEvents.forEach((event) => {
    const current = workEventsBySessionId.get(event.workSessionId) ?? []
    current.push(event)
    workEventsBySessionId.set(event.workSessionId, current)
  })

  return herds.map((herd): HerdExportBundle => {
    const herdAnimals = animals.filter((animal) => animal.herdId === herd.id)
    const herdAssignments = enclosureAssignments
      .filter((assignment) => assignment.herdId === herd.id)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    const herdSessions = sessions
      .filter((session) => session.herdId === herd.id)
      .sort((left, right) => right.startTime.localeCompare(left.startTime))
    const herdWorkSessions = workSessions
      .filter((session) => session.herdId === herd.id)
      .sort((left, right) => right.startTime.localeCompare(left.startTime))

    const relatedEnclosureIds = new Set<string>()

    enclosures.forEach((enclosure) => {
      if (enclosure.herdId === herd.id) {
        relatedEnclosureIds.add(enclosure.id)
      }
    })

    herdAssignments.forEach((assignment) => {
      relatedEnclosureIds.add(assignment.enclosureId)
    })

    herdWorkSessions.forEach((session) => {
      if (session.enclosureId) {
        relatedEnclosureIds.add(session.enclosureId)
      }
    })

    const herdEnclosures = enclosures
      .filter((enclosure) => relatedEnclosureIds.has(enclosure.id))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))

    const herdGrazingSessions = herdSessions.map((session) => ({
      session,
      trackpoints: [...(trackpointsBySessionId.get(session.id) ?? [])].sort(
        (left, right) => left.seq - right.seq
      ),
      events: [...(eventsBySessionId.get(session.id) ?? [])].sort((left, right) =>
        left.timestamp.localeCompare(right.timestamp)
      ),
    }))

    const herdWorkSessionBundles = herdWorkSessions.map((session) => ({
      session,
      events: [...(workEventsBySessionId.get(session.id) ?? [])].sort((left, right) =>
        left.timestamp.localeCompare(right.timestamp)
      ),
    }))

    return {
      herd,
      summary: {
        animals: herdAnimals.length,
        activeAnimals: herdAnimals.filter((animal) => !animal.isArchived).length,
        enclosures: herdEnclosures.length,
        activeAssignments: herdAssignments.filter((assignment) => !assignment.endTime).length,
        allAssignments: herdAssignments.length,
        grazingSessions: herdGrazingSessions.length,
        grazingTrackpoints: herdGrazingSessions.reduce(
          (sum, session) => sum + session.trackpoints.length,
          0
        ),
        grazingEvents: herdGrazingSessions.reduce((sum, session) => sum + session.events.length, 0),
        workSessions: herdWorkSessionBundles.length,
        workEvents: herdWorkSessionBundles.reduce((sum, session) => sum + session.events.length, 0),
      },
      animals: herdAnimals,
      enclosures: herdEnclosures,
      enclosureAssignments: herdAssignments,
      grazingSessions: herdGrazingSessions,
      workSessions: herdWorkSessionBundles,
    }
  })
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

async function importPayloadIntoDb(preparedImport: PreparedImportPayload) {
  const { clearKeys, counts, payload } = preparedImport
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
      if (clearKeys.length > 0) {
        const clearTableByKey = {
          workEvents: () => db.workEvents.clear(),
          workSessions: () => db.workSessions.clear(),
          sessionEvents: () => db.events.clear(),
          trackpoints: () => db.trackpoints.clear(),
          grazingSessions: () => db.sessions.clear(),
          enclosureAssignments: () => db.enclosureAssignments.clear(),
          surveyAreas: () => db.surveyAreas.clear(),
          animals: () => db.animals.clear(),
          enclosures: () => db.enclosures.clear(),
          herds: () => db.herds.clear(),
          settings: () => db.settings.clear(),
        } satisfies Record<keyof typeof counts, () => Promise<void>>

        for (const key of clearKeys) {
          await clearTableByKey[key]()
        }
      }

      if (payload.herds.length > 0) await db.herds.bulkPut(payload.herds)
      if (payload.animals.length > 0) await db.animals.bulkPut(payload.animals)
      if (payload.enclosures.length > 0) await db.enclosures.bulkPut(payload.enclosures)
      if (payload.surveyAreas.length > 0) await db.surveyAreas.bulkPut(payload.surveyAreas)
      if (payload.enclosureAssignments.length > 0) {
        await db.enclosureAssignments.bulkPut(payload.enclosureAssignments)
      }
      if (payload.grazingSessions.length > 0) await db.sessions.bulkPut(payload.grazingSessions)
      if (payload.trackpoints.length > 0) await db.trackpoints.bulkPut(payload.trackpoints)
      if (payload.sessionEvents.length > 0) await db.events.bulkPut(payload.sessionEvents)
      if (payload.workSessions.length > 0) await db.workSessions.bulkPut(payload.workSessions)
      if (payload.workEvents.length > 0) await db.workEvents.bulkPut(payload.workEvents)
      if (payload.settings.length > 0) await db.settings.bulkPut(payload.settings)
    }
  )

  return counts
}

function buildImportPreviewResult(
  sourceLabel: string,
  kind: ImportSourceKind,
  payload: ImportPayload,
  warnings: string[]
): ImportPreview {
  const presentKeys = getPresentImportPayloadKeys(payload)
  const isCompleteAppData = isCompleteAppDataPayload(presentKeys)
  const counts = getImportCounts(payload)
  const nextWarnings = [...warnings]

  if (
    (kind === 'zip-export' || kind === 'app-data-json') &&
    presentKeys.length > 0 &&
    !isCompleteAppData
  ) {
    nextWarnings.push(
      'Datei enthält nur Teilmengen der App-Daten. `Ersetzen` ist damit nicht erlaubt.'
    )
  }

  if (Object.values(counts).every((count) => count === 0)) {
    nextWarnings.push('Datei enthält keine importierbaren Datensätze.')
  }

  return {
    sourceLabel,
    meta: {
      kind,
      presentKeys,
      isCompleteAppData,
    },
    payload,
    counts,
    warnings: nextWarnings,
  }
}

async function getExistingImportRefs(): Promise<ExistingImportRefs> {
  const [animals, herdIds, enclosureIds, sessionIds, workSessionIds] = await Promise.all([
    db.animals.toArray(),
    db.herds.toCollection().primaryKeys(),
    db.enclosures.toCollection().primaryKeys(),
    db.sessions.toCollection().primaryKeys(),
    db.workSessions.toCollection().primaryKeys(),
  ])

  return {
    animalEarTags: new Map(
      animals.map((animal) => [animal.earTag.trim().toLowerCase(), animal.id])
    ),
    enclosureIds: new Set(enclosureIds.map((id) => String(id))),
    herdIds: new Set(herdIds.map((id) => String(id))),
    sessionIds: new Set(sessionIds.map((id) => String(id))),
    workSessionIds: new Set(workSessionIds.map((id) => String(id))),
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
      payload = parseImportPayload(JSON.parse(await appDataEntry.async('string')))
    } else {
      warnings.push('ZIP enthält keine `app-data.json`.')
    }

    if (surveyAreasEntry) {
      const importedSurveyAreas = buildSurveyAreasFromGeoJson(
        await surveyAreasEntry.async('string'),
        'Untersuchungsfläche'
      )
      if (payload.surveyAreas) {
        warnings.push(
          'ZIP enthält Untersuchungsflächen sowohl in `app-data.json` als auch als GeoJSON. `app-data.json` wird bevorzugt.'
        )
      } else {
        payload = {
          ...payload,
          surveyAreas: importedSurveyAreas,
        }
      }
    }

    if (!appDataEntry && !surveyAreasEntry) {
      throw new Error('ZIP enthält keine importierbaren Dateien.')
    }

    return buildImportPreviewResult(
      appDataEntry ? 'ZIP-Export' : 'ZIP mit Untersuchungsflächen',
      appDataEntry ? 'zip-export' : 'survey-geojson',
      payload,
      warnings
    )
  }

  if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
    const content = await file.text()
    const parsed = JSON.parse(content) as Record<string, unknown>
    const payload = parseImportPayload(parsed)
    const presentKeys = getPresentImportPayloadKeys(payload)

    if (
      presentKeys.length > 0 ||
      (typeof parsed.app === 'string' && parsed.app.toLowerCase().includes('hiaterbua'))
    ) {
      return buildImportPreviewResult('App-Daten JSON', 'app-data-json', payload, [])
    }

    const surveyAreas = buildSurveyAreasFromGeoJson(content, 'Untersuchungsfläche')

    return buildImportPreviewResult(
      'Untersuchungsflächen GeoJSON',
      'survey-geojson',
      { surveyAreas },
      []
    )
  }

  throw new Error('Unterstützt werden ZIP, JSON und GeoJSON.')
}

export default function ExportPage() {
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingHerd, setIsExportingHerd] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [exportableHerds, setExportableHerds] = useState<Herd[] | null>(null)
  const [replaceExisting, setReplaceExisting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedHerdExportId, setSelectedHerdExportId] = useState('')
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [isAnalyzingImport, setIsAnalyzingImport] = useState(false)

  const selectedFileLabel = useMemo(() => {
    if (!selectedFile) return 'Keine Datei gewählt.'
    return `${selectedFile.name} (${Math.round(selectedFile.size / 1024)} KB)`
  }, [selectedFile])

  const canReplaceExisting = useMemo(() => {
    if (!importPreview) {
      return false
    }

    return (
      importPreview.meta.isCompleteAppData ||
      (importPreview.meta.presentKeys.length > 0 &&
        importPreview.meta.presentKeys.every(
          (key) => key === 'surveyAreas' || key === 'settings'
        ))
    )
  }, [importPreview])

  const activeHerdExportId = useMemo(() => {
    if (!exportableHerds || exportableHerds.length === 0) {
      return ''
    }

    if (selectedHerdExportId && exportableHerds.some((herd) => herd.id === selectedHerdExportId)) {
      return selectedHerdExportId
    }

    return exportableHerds[0].id
  }, [exportableHerds, selectedHerdExportId])

  useEffect(() => {
    let cancelled = false

    async function loadExportableHerds() {
      const herdList = await db.herds.orderBy('name').toArray()
      if (!cancelled) {
        setExportableHerds(herdList)
      }
    }

    void loadExportableHerds()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadExportableHerds()
      }
    }

    window.addEventListener('focus', loadExportableHerds)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      window.removeEventListener('focus', loadExportableHerds)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

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
      const herdExport = {
        exportedAt: appData.exportedAt,
        app: appData.app,
        herds: buildHerdExportBundles({
          herds,
          animals,
          enclosures,
          enclosureAssignments,
          sessions,
          trackpoints,
          events,
          workSessions,
          workEvents,
        }),
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
        'herds/herds.json: Herden mit Tieren, Belegungen, Sitzungen und Arbeitseinsätzen',
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
      zip.file('herds/herds.json', JSON.stringify(herdExport, null, 2))

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

  async function handleExportSingleHerd() {
    if (!activeHerdExportId) {
      setError('Bitte zuerst eine Herde wählen.')
      return
    }

    setIsExportingHerd(true)
    setStatus('')
    setError('')

    try {
      const herd = await db.herds.get(activeHerdExportId)

      if (!herd) {
        throw new Error('Gewählte Herde wurde nicht gefunden.')
      }

      const [animals, enclosureAssignments, sessions, workSessions, directHerdEnclosures] =
        await Promise.all([
          db.animals.where('herdId').equals(herd.id).toArray(),
          db.enclosureAssignments.where('herdId').equals(herd.id).toArray(),
          db.sessions.where('herdId').equals(herd.id).toArray(),
          db.workSessions.where('herdId').equals(herd.id).toArray(),
          db.enclosures.where('herdId').equals(herd.id).toArray(),
        ])

      const relatedEnclosureIds = [
        ...new Set(
          [
            ...enclosureAssignments.map((assignment) => assignment.enclosureId),
            ...workSessions
              .map((session) => session.enclosureId)
              .filter((enclosureId): enclosureId is string => Boolean(enclosureId)),
          ].filter((enclosureId) => !directHerdEnclosures.some((enclosure) => enclosure.id === enclosureId))
        ),
      ]

      const [trackpoints, events, workEvents, referencedEnclosures] = await Promise.all([
        sessions.length > 0
          ? db.trackpoints
              .where('sessionId')
              .anyOf(sessions.map((session) => session.id))
              .toArray()
          : Promise.resolve([] as TrackPoint[]),
        sessions.length > 0
          ? db.events
              .where('sessionId')
              .anyOf(sessions.map((session) => session.id))
              .toArray()
          : Promise.resolve([] as SessionEvent[]),
        workSessions.length > 0
          ? db.workEvents
              .where('workSessionId')
              .anyOf(workSessions.map((session) => session.id))
              .toArray()
          : Promise.resolve([] as WorkEvent[]),
        relatedEnclosureIds.length > 0
          ? db.enclosures.bulkGet(relatedEnclosureIds)
          : Promise.resolve([] as Array<Enclosure | undefined>),
      ])

      const bundle = buildHerdExportBundles({
        herds: [herd],
        animals,
        enclosures: [
          ...directHerdEnclosures,
          ...referencedEnclosures.filter(
            (enclosure): enclosure is Enclosure =>
              enclosure !== undefined &&
              !directHerdEnclosures.some((existing) => existing.id === enclosure.id)
          ),
        ],
        enclosureAssignments,
        sessions,
        trackpoints,
        events,
        workSessions,
        workEvents,
      })[0]

      const payload = {
        exportedAt: new Date().toISOString(),
        app: 'Hiaterbua 1.0',
        herd: bundle,
      }

      downloadBlob(
        new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
        `hiaterbua-herde-${sanitizeFilenamePart(herd.name)}-${new Date().toISOString().slice(0, 10)}.json`
      )
      setStatus(`Herde "${herd.name}" als JSON exportiert.`)
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Herde konnte nicht exportiert werden.'
      )
    } finally {
      setIsExportingHerd(false)
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
      const existingRefs = await getExistingImportRefs()
      const preparedImport = prepareImportPayload(
        importPreview.payload,
        importPreview.meta,
        replaceExisting,
        existingRefs
      )
      const counts = await importPayloadIntoDb(preparedImport)
      setStatus(
        `Import abgeschlossen (${replaceExisting ? 'Ersetzen' : 'Zusammenführen'}). Herden: ${counts.herds}, Tiere: ${counts.animals}, Pferche: ${counts.enclosures}, Untersuchungsflächen: ${counts.surveyAreas}, Belegungen: ${counts.enclosureAssignments}, Weidegänge: ${counts.grazingSessions}, Trackpunkte: ${counts.trackpoints}, Ereignisse: ${counts.sessionEvents}, Arbeit: ${counts.workSessions}, Arbeitsereignisse: ${counts.workEvents}, Settings: ${counts.settings}.`
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
      if (replaceExisting) {
        const nextCanReplace =
          preview.meta.isCompleteAppData ||
          (preview.meta.presentKeys.length > 0 &&
            preview.meta.presentKeys.every(
              (key) => key === 'surveyAreas' || key === 'settings'
            ))
        if (!nextCanReplace) {
          setReplaceExisting(false)
        }
      }
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
      <section className="rounded-3xl border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
        <h1 className="text-2xl font-semibold">Export & Import</h1>
        <p className="mt-2 text-sm font-medium text-neutral-800">
          QGIS-taugliche Raumdaten als GeoJSON, Spuren zusätzlich als GPX und übrige App-Daten als JSON bündeln oder wieder einlesen.
        </p>
      </section>

      <section className="rounded-3xl border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
        <h2 className="text-lg font-semibold">ZIP-Export</h2>
        <p className="mt-2 text-sm font-medium text-neutral-800">
          Enthält Pferche, Untersuchungsflächen, geführte Weidegänge, Trackpunkte, GPX-Dateien, `herds/herds.json` für vollständige Herden-Pakete und `app-data.json` für den vollständigen App-Import.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-4 text-sm text-neutral-900">
            <div className="font-medium text-neutral-900">Für QGIS</div>
            <div className="mt-2">`enclosures.geojson`</div>
            <div>`survey_areas.geojson`</div>
            <div>`grazing_sessions.geojson`</div>
            <div>`grazing_trackpoints.geojson`</div>
            <div>`session_events.geojson`</div>
            <div>`enclosure_walk_trackpoints.geojson`</div>
          </div>
          <div className="rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-4 text-sm text-neutral-900">
            <div className="font-medium text-neutral-900">Weitere Dateien</div>
            <div className="mt-2">`grazing_sessions.gpx`</div>
            <div>`enclosure_walks.gpx`</div>
            <div>`herds/herds.json`</div>
            <div>`app-data.json`</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleExportZip()}
          disabled={isExporting}
          className="mt-4 rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-4 py-4 font-semibold text-[#17130f] disabled:opacity-50"
        >
          {isExporting ? 'Erstellt Export ...' : 'ZIP-Export herunterladen'}
        </button>

        <p className="mt-3 text-xs font-medium text-neutral-700">
          GeoPackage ist bewusst noch nicht enthalten, weil im Projekt aktuell keine Schreibbibliothek dafür integriert ist.
        </p>
      </section>

      <section className="rounded-3xl border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
        <h2 className="text-lg font-semibold">Einzelne Herde exportieren</h2>
        <p className="mt-2 text-sm font-medium text-neutral-800">
          Exportiert genau eine Herde als eigene JSON-Datei mit Stammdaten, Tieren, Belegungen, zugehörigen Pferchen, Weidegängen und Arbeitseinsätzen.
        </p>

        {exportableHerds === null ? (
          <div className="mt-4 rounded-2xl border border-[#ccb98a] bg-[#efe4c8] px-4 py-3 text-sm font-semibold text-neutral-900">
            Lade Herden ...
          </div>
        ) : exportableHerds.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-neutral-800">
            Keine Herde vorhanden.
          </div>
        ) : (
          <>
            <label className="mt-4 block text-sm font-medium text-neutral-900">
              Herde wählen
              <select
                value={activeHerdExportId}
                onChange={(event) => setSelectedHerdExportId(event.target.value)}
                className="mt-2 w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-neutral-950"
              >
                {exportableHerds.map((herd) => (
                  <option key={herd.id} value={herd.id}>
                    {herd.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => void handleExportSingleHerd()}
              disabled={isExportingHerd}
              className="mt-4 rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-4 py-4 font-semibold text-[#17130f] disabled:opacity-50"
            >
              {isExportingHerd ? 'Erstellt Herden-JSON ...' : 'Herde als JSON herunterladen'}
            </button>
          </>
        )}
      </section>

      <section className="rounded-3xl border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
        <h2 className="text-lg font-semibold">Import</h2>
        <p className="mt-2 text-sm font-medium text-neutral-800">
          Importiert `app-data.json`, den gesamten ZIP-Export oder ein separates GeoJSON für Untersuchungsflächen.
        </p>

        <label className="mt-4 block rounded-2xl border-2 border-dashed border-[#ccb98a] bg-[#fffdf6] px-4 py-4 text-sm text-neutral-900">
          <div className="font-medium text-neutral-900">Datei wählen</div>
          <div className="mt-1 font-medium text-neutral-800">{selectedFileLabel}</div>
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
          <div className="mt-4 rounded-2xl border border-[#ccb98a] bg-[#efe4c8] px-4 py-3 text-sm font-semibold text-neutral-900">
            Analysiere Importdatei ...
          </div>
        ) : null}

        {importPreview ? (
          <div className="mt-4 rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-neutral-950">Importübersicht</div>
                <div className="mt-1 text-sm text-neutral-700">{importPreview.sourceLabel}</div>
              </div>
              <div className="rounded-full border border-[#ccb98a] bg-[#efe4c8] px-3 py-1 text-xs font-semibold text-neutral-950">
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
                  className="rounded-2xl border-2 border-[#ccb98a] bg-[#fff8ea] px-3 py-3 text-sm text-neutral-900"
                >
                  <div className="font-medium text-neutral-700">{label}</div>
                  <div className="mt-1 font-semibold text-neutral-950">{value}</div>
                </div>
              ))}
            </div>

            {importPreview.warnings.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-amber-300 bg-[#fff1c7] px-4 py-3 text-sm font-medium text-amber-950">
                {importPreview.warnings.map((warning) => (
                  <div key={warning}>{warning}</div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <label className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-4 text-sm text-neutral-900">
          <input
            type="checkbox"
            checked={replaceExisting}
            onChange={(event) => setReplaceExisting(event.target.checked)}
            disabled={!!importPreview && !canReplaceExisting}
            className="mt-1 h-4 w-4 rounded border-neutral-300"
          />
          <span>
            <span className="block font-medium text-neutral-900">Vorhandene Daten vorher löschen</span>
            <span className="block font-medium text-neutral-800">
              Ohne Haken werden Datensätze anhand ihrer `id` ergänzt oder überschrieben.
            </span>
            {importPreview && !canReplaceExisting ? (
              <span className="mt-1 block font-medium text-amber-900">
                Für diese Datei ist `Ersetzen` gesperrt, weil nur Teilmengen importiert werden.
              </span>
            ) : null}
          </span>
        </label>

        <button
          type="button"
          onClick={() => void handleImport()}
          disabled={isImporting || isAnalyzingImport || !selectedFile || !importPreview}
          className="mt-4 rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-4 py-4 font-semibold text-[#17130f] disabled:opacity-50"
        >
          {isImporting ? 'Import läuft ...' : 'Import starten'}
        </button>
      </section>

      {status ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-900">
          {status}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-300 bg-red-100 px-4 py-3 text-sm font-semibold text-red-900">
          {error}
        </div>
      ) : null}
    </div>
  )
}
