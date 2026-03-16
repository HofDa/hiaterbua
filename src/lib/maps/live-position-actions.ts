import { db } from '@/lib/db/dexie'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type {
  Animal,
  Enclosure,
  EnclosureAssignment,
  Herd,
  TrackPoint,
} from '@/types/domain'

type PositionData = {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

type DraftPoint = {
  lat: number
  lon: number
}

export async function appendWalkTrackpoint(params: {
  enclosureWalkId: string
  lastTimestamp: number | null
  nextSeq: number
  nextPosition: PositionData
}) {
  const { enclosureWalkId, lastTimestamp, nextSeq, nextPosition } = params

  if (lastTimestamp === nextPosition.timestamp) {
    return null
  }

  const trackPoint: TrackPoint = {
    id: createId('trackpoint'),
    enclosureWalkId,
    sessionId: null,
    seq: nextSeq,
    timestamp: new Date(nextPosition.timestamp).toISOString(),
    lat: nextPosition.latitude,
    lon: nextPosition.longitude,
    accuracyM: nextPosition.accuracy,
    accepted: true,
  }

  await db.trackpoints.add(trackPoint)

  return {
    trackPoint,
    nextSeq,
    lastTimestamp: nextPosition.timestamp,
  }
}

export async function discardWalkTrack(enclosureWalkId: string | null) {
  if (!enclosureWalkId) return
  await db.trackpoints.where('enclosureWalkId').equals(enclosureWalkId).delete()
}

export async function removeWalkTrackpointAtIndex(params: {
  enclosureWalkId: string
  walkPoints: PositionData[]
  pointIndex: number
}) {
  const { enclosureWalkId, walkPoints, pointIndex } = params
  if (pointIndex < 0 || pointIndex >= walkPoints.length) {
    return null
  }

  const walkTrackPoints = await db.trackpoints
    .where('enclosureWalkId')
    .equals(enclosureWalkId)
    .sortBy('seq')

  const trackPointToDelete = walkTrackPoints[pointIndex]
  if (!trackPointToDelete) {
    return null
  }

  await db.transaction('rw', db.trackpoints, async () => {
    await db.trackpoints.delete(trackPointToDelete.id)

    const remainingTrackPoints = walkTrackPoints.filter(
      (trackPoint) => trackPoint.id !== trackPointToDelete.id
    )

    await Promise.all(
      remainingTrackPoints.map((trackPoint, index) =>
        db.trackpoints.update(trackPoint.id, {
          seq: index + 1,
        })
      )
    )
  })

  const nextPoints = walkPoints.filter((_, index) => index !== pointIndex)
  return {
    nextPoints,
    nextSeq: nextPoints.length,
    lastTimestamp: nextPoints.length > 0 ? nextPoints[nextPoints.length - 1].timestamp : null,
    message:
      pointIndex === walkPoints.length - 1
        ? 'Letzter Walk-Punkt entfernt.'
        : `Walk-Punkt ${pointIndex + 1} entfernt.`,
  }
}

export function getDefaultAssignmentValues(params: {
  herds: Herd[]
  animalsByHerdId: Map<string, Animal[]>
  getEffectiveHerdCount: (herd: Herd | undefined, animals: Animal[]) => number | null
}) {
  const { herds, animalsByHerdId, getEffectiveHerdCount } = params
  const firstActiveHerd = herds.find((herd) => !herd.isArchived) ?? herds[0]
  const herdId = firstActiveHerd?.id ?? ''
  const effectiveCount = herdId
    ? getEffectiveHerdCount(firstActiveHerd, animalsByHerdId.get(herdId) ?? [])
    : null

  return {
    herdId,
    count: effectiveCount !== null ? String(effectiveCount) : '',
  }
}

export async function assignHerdToEnclosureRecord(params: {
  enclosure: Enclosure
  herdId: string
  count: number | null
  notes: string
}) {
  const { enclosure, herdId, count, notes } = params
  const timestamp = nowIso()

  await db.transaction('rw', db.enclosureAssignments, db.enclosures, async () => {
    const activeAssignments = (await db.enclosureAssignments.toArray()).filter(
      (assignment) => !assignment.endTime
    )
    const activeEnclosureAssignment =
      activeAssignments.find((assignment) => assignment.enclosureId === enclosure.id) ?? null
    const activeHerdAssignment =
      activeAssignments.find((assignment) => assignment.herdId === herdId) ?? null

    if (activeEnclosureAssignment) {
      throw new Error('Dieser Pferch ist bereits aktiv belegt.')
    }

    if (activeHerdAssignment && activeHerdAssignment.enclosureId !== enclosure.id) {
      throw new Error('Diese Herde ist bereits einem anderen Pferch zugewiesen.')
    }

    await db.enclosureAssignments.add({
      id: createId('enclosure_assignment'),
      enclosureId: enclosure.id,
      herdId,
      count,
      startTime: timestamp,
      endTime: null,
      notes: notes.trim() || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    })

    await db.enclosures.update(enclosure.id, {
      herdId,
      updatedAt: timestamp,
    })
  })
}

export async function endEnclosureAssignmentRecord(assignment: EnclosureAssignment) {
  const timestamp = nowIso()

  await db.transaction('rw', db.enclosureAssignments, db.enclosures, async () => {
    await db.enclosureAssignments.update(assignment.id, {
      endTime: timestamp,
      updatedAt: timestamp,
    })

    await db.enclosures.update(assignment.enclosureId, {
      herdId: null,
      updatedAt: timestamp,
    })
  })
}

export async function updateEditedEnclosureRecord(params: {
  enclosureId: string
  name: string
  notes: string
  geometry: Enclosure['geometry']
  areaM2: number
  pointsCount: number
}) {
  const { enclosureId, name, notes, geometry, areaM2, pointsCount } = params
  const timestamp = nowIso()

  await db.enclosures.update(enclosureId, {
    name,
    geometry,
    areaM2,
    areaHa: areaM2 / 10_000,
    pointsCount,
    notes: notes.trim() || undefined,
    updatedAt: timestamp,
  })
}

export async function deleteEnclosureRecord(enclosureId: string) {
  await db.enclosures.delete(enclosureId)
  await db.trackpoints.where('enclosureWalkId').equals(enclosureId).delete()
}

export async function saveWalkEnclosureRecord(params: {
  enclosureId: string
  name: string
  notes: string
  walkPoints: PositionData[]
  walkAreaM2: number
}) {
  const { enclosureId, name, notes, walkPoints, walkAreaM2 } = params
  const timestamp = nowIso()
  const averageAccuracy =
    walkPoints.reduce((sum, point) => sum + point.accuracy, 0) / walkPoints.length

  const coordinates = walkPoints.map(
    (point) => [point.longitude, point.latitude] as [number, number]
  )
  coordinates.push([walkPoints[0].longitude, walkPoints[0].latitude])

  const enclosure: Enclosure = {
    id: enclosureId,
    name,
    method: 'walk',
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
    areaM2: walkAreaM2,
    areaHa: walkAreaM2 / 10_000,
    notes: notes.trim() || undefined,
    pointsCount: walkPoints.length,
    avgAccuracyM: averageAccuracy,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await db.enclosures.put(enclosure)
  return enclosure
}

export async function saveDrawnEnclosureRecord(params: {
  name: string
  notes: string
  geometry: Enclosure['geometry']
  areaM2: number
  points: DraftPoint[]
  accuracyM: number | null
}) {
  const { name, notes, geometry, areaM2, points, accuracyM } = params
  const timestamp = nowIso()
  const enclosureId = createId('enclosure')

  const enclosure: Enclosure = {
    id: enclosureId,
    name,
    method: 'draw',
    geometry,
    areaM2,
    areaHa: areaM2 / 10_000,
    notes: notes.trim() || undefined,
    pointsCount: points.length,
    avgAccuracyM: accuracyM,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await db.enclosures.add(enclosure)
  return enclosure
}
