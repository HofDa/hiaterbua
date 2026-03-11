import type * as GeoJSON from 'geojson'
import {
  buildGpxTrack,
  buildHerdExportBundles,
  hasGeometry,
} from '@/lib/import-export/file-formats'
import type {
  Animal,
  Enclosure,
  EnclosureAssignment,
  GrazingSession,
  Herd,
  SessionEvent,
  SurveyArea,
  TrackPoint,
  WorkEvent,
  WorkSession,
  AppSettings,
} from '@/types/domain'

type BuildAppExportArtifactsOptions = {
  herds: Herd[]
  animals: Animal[]
  enclosures: Enclosure[]
  surveyAreas: SurveyArea[]
  enclosureAssignments: EnclosureAssignment[]
  sessions: GrazingSession[]
  trackpoints: TrackPoint[]
  events: SessionEvent[]
  workSessions: WorkSession[]
  workEvents: WorkEvent[]
  settings: AppSettings[]
}

export function buildAppExportArtifacts({
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
}: BuildAppExportArtifactsOptions) {
  const trackpointsBySessionId = new Map<string, TrackPoint[]>()
  const trackpointsByEnclosureWalkId = new Map<string, TrackPoint[]>()
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

  const surveyAreaFeatures: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[] =
    surveyAreas.map((surveyArea) => ({
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

  const grazingSessionFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = sessions.flatMap(
    (session) => {
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
            animalCount: session.animalCount ?? null,
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
    }
  )

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
    app: 'Pastore 1.0',
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
    'Pastore 1.0 Weidegänge',
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
    'Pastore 1.0 Pferch-Walks',
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

  return {
    appData,
    herdExport,
    enclosureFeatures,
    surveyAreaFeatures,
    grazingSessionFeatures,
    grazingTrackpointFeatures,
    enclosureWalkTrackpointFeatures,
    sessionEventFeatures,
    grazingGpx,
    enclosureWalkGpx,
  }
}
