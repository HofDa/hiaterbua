import { db } from '@/lib/db/dexie'
import { createId } from '@/lib/utils/ids'
import type { GpsPosition } from '@/lib/maps/position-types'
import type { Animal, Herd, TrackPoint } from '@/types/domain'

type PositionData = GpsPosition

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
