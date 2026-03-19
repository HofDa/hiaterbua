import { area as turfArea } from '@turf/turf'
import type * as GeoJSON from 'geojson'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
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
} from '@/types/domain'

export type HerdExportBundle = {
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

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function sanitizeFilenamePart(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized.length > 0 ? normalized : 'herde'
}

export function buildFeatureCollection(
  features: GeoJSON.Feature[],
): GeoJSON.FeatureCollection<GeoJSON.Geometry, GeoJSON.GeoJsonProperties> {
  return {
    type: 'FeatureCollection',
    features,
  }
}

export function buildHerdExportBundles(input: {
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
        (left, right) => left.seq - right.seq,
      ),
      events: [...(eventsBySessionId.get(session.id) ?? [])].sort((left, right) =>
        left.timestamp.localeCompare(right.timestamp),
      ),
    }))

    const herdWorkSessionBundles = herdWorkSessions.map((session) => ({
      session,
      events: [...(workEventsBySessionId.get(session.id) ?? [])].sort((left, right) =>
        left.timestamp.localeCompare(right.timestamp),
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
          0,
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

export function hasGeometry(
  enclosure: Enclosure,
): enclosure is Enclosure & {
  geometry: GeoJSON.Polygon
} {
  return enclosure.geometry !== null
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function buildGpxTrack(
  name: string,
  segments: Array<{
    name: string
    points: Array<{ lat: number; lon: number; timestamp: string }>
  }>,
) {
  const tracksXml = segments
    .filter((segment) => segment.points.length > 0)
    .map((segment) => {
      const pointsXml = segment.points
        .map(
          (point) =>
            `<trkpt lat="${point.lat}" lon="${point.lon}"><time>${escapeXml(point.timestamp)}</time></trkpt>`,
        )
        .join('')

      return `<trk><name>${escapeXml(segment.name)}</name><trkseg>${pointsXml}</trkseg></trk>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Pastore 1.0" xmlns="http://www.topografix.com/GPX/1/1">
<metadata><name>${escapeXml(name)}</name></metadata>
${tracksXml}
</gpx>`
}

function hasPolygonGeometry(
  feature: GeoJSON.Feature,
): feature is GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> {
  return (
    feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon'
  )
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

export function buildSurveyAreasFromGeoJson(
  content: string,
  fallbackName: string,
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
        importOrder: index,
        createdAt:
          typeof properties.createdAt === 'string' ? properties.createdAt : importedAt,
        updatedAt:
          typeof properties.updatedAt === 'string' ? properties.updatedAt : importedAt,
      }
    })
}
