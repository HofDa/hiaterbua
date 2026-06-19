import { db } from '@/lib/db/dexie'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type { Herd } from '@/types/domain'

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Every herd — for counts, backup and export. */
export function listAllHerds(): Promise<Herd[]> {
  return db.herds.toArray()
}

/** Herds ordered by name, for selection lists. */
export function listHerdsByName(): Promise<Herd[]> {
  return db.herds.orderBy('name').toArray()
}

/** Herds, most recently updated first. */
export function listHerdsByRecent(): Promise<Herd[]> {
  return db.herds.orderBy('updatedAt').reverse().toArray()
}

/** A single herd, or `undefined` when it does not exist. */
export function getHerd(herdId: string): Promise<Herd | undefined> {
  return db.herds.get(herdId)
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createHerdRecord(params: {
  name: string
  fallbackCount: number | null
  notes: string
}): Promise<Herd> {
  const { name, fallbackCount, notes } = params
  const timestamp = nowIso()

  const herd: Herd = {
    id: createId('herd'),
    name: name.trim(),
    fallbackCount,
    notes: notes.trim() || undefined,
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await db.herds.add(herd)
  return herd
}

/**
 * Apply a partial update to a herd, stamping `updatedAt`. Returns the number of
 * records changed (0 when the herd no longer exists), so callers can surface a
 * "not found" state.
 */
export function updateHerdRecord(
  herdId: string,
  patch: Partial<Pick<Herd, 'name' | 'fallbackCount' | 'notes' | 'isArchived'>>,
): Promise<number> {
  return db.herds.update(herdId, { ...patch, updatedAt: nowIso() })
}
