import { db } from '@/lib/db/dexie'
import {
  findAssignmentConflict,
  isActiveEnclosure,
  selectActiveAssignments,
} from '@/lib/db/repositories/enclosure-rules'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type { Enclosure, EnclosureAssignment } from '@/types/domain'

type DraftPoint = {
  lat: number
  lon: number
}

// ---------------------------------------------------------------------------
// Reads
//
// Display reads return only active enclosures (see `isActiveEnclosure`), so
// enclosure versioning can be enabled later without touching every screen.
// `listAllEnclosures` intentionally returns every row for backup/export, which
// must capture superseded history too.
// ---------------------------------------------------------------------------

/** Active enclosures ordered by name, for selection lists. */
export async function listActiveEnclosuresByName(): Promise<Enclosure[]> {
  const enclosures = await db.enclosures.orderBy('name').toArray()
  return enclosures.filter(isActiveEnclosure)
}

/** Active enclosures, most recently updated first. */
export async function listActiveEnclosuresByRecent(): Promise<Enclosure[]> {
  const enclosures = await db.enclosures.orderBy('updatedAt').reverse().toArray()
  return enclosures.filter(isActiveEnclosure)
}

/** Active enclosures in storage order — for counts and aggregates. */
export async function listActiveEnclosures(): Promise<Enclosure[]> {
  const enclosures = await db.enclosures.toArray()
  return enclosures.filter(isActiveEnclosure)
}

/** Every enclosure, including superseded ones — for backup and export. */
export function listAllEnclosures(): Promise<Enclosure[]> {
  return db.enclosures.toArray()
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function assignHerdToEnclosureRecord(params: {
  enclosure: Enclosure
  herdId: string
  count: number | null
  notes: string
}): Promise<void> {
  const { enclosure, herdId, count, notes } = params
  const timestamp = nowIso()

  await db.transaction('rw', db.enclosureAssignments, db.enclosures, async () => {
    const activeAssignments = selectActiveAssignments(await db.enclosureAssignments.toArray())
    const conflict = findAssignmentConflict(activeAssignments, enclosure.id, herdId)

    if (conflict === 'enclosure-occupied') {
      throw new Error('Dieser Pferch ist bereits aktiv belegt.')
    }

    if (conflict === 'herd-assigned-elsewhere') {
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

export async function endEnclosureAssignmentRecord(assignment: EnclosureAssignment): Promise<void> {
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
}): Promise<void> {
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

export async function deleteEnclosureRecord(enclosureId: string): Promise<void> {
  await db.transaction('rw', db.enclosures, db.trackpoints, db.enclosureAssignments, async () => {
    const activeAssignment = await db.enclosureAssignments
      .where('enclosureId')
      .equals(enclosureId)
      .filter((assignment) => !assignment.endTime)
      .first()

    if (activeAssignment) {
      throw new Error('Pferch ist aktuell belegt. Belegung zuerst beenden.')
    }

    await db.trackpoints.where('enclosureWalkId').equals(enclosureId).delete()
    await db.enclosures.delete(enclosureId)
  })
}

export async function saveWalkEnclosureRecord(params: {
  enclosureId: string
  name: string
  notes: string
  walkPoints: { latitude: number; longitude: number; accuracy: number }[]
  walkAreaM2: number
}): Promise<Enclosure> {
  const { enclosureId, name, notes, walkPoints, walkAreaM2 } = params
  const timestamp = nowIso()
  const averageAccuracy =
    walkPoints.reduce((sum, point) => sum + point.accuracy, 0) / walkPoints.length

  const coordinates = walkPoints.map(
    (point) => [point.longitude, point.latitude] as [number, number],
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
}): Promise<Enclosure> {
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
