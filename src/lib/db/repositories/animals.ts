import { db } from '@/lib/db/dexie'
import { buildLocalChangeMetadata, buildLocalChangePatch } from '@/lib/sync/local-metadata'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type { Animal, Species } from '@/types/domain'

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Every animal — for counts, backup and export. */
export function listAllAnimals(): Promise<Animal[]> {
  return db.animals.toArray()
}

/** The animals belonging to a herd. */
export function listAnimalsByHerd(herdId: string): Promise<Animal[]> {
  return db.animals.where('herdId').equals(herdId).toArray()
}

/** Finds an animal by ear tag, case-insensitively — used to enforce uniqueness. */
export function findAnimalByEarTag(earTag: string): Promise<Animal | undefined> {
  return db.animals.where('earTag').equalsIgnoreCase(earTag).first()
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createAnimalRecord(params: {
  herdId: string
  earTag: string
  species: Species
  name: string
  notes: string
}): Promise<Animal> {
  const { herdId, earTag, species, name, notes } = params
  const timestamp = nowIso()

  const animal: Animal = {
    id: createId('animal'),
    herdId,
    earTag,
    species,
    name: name.trim() || undefined,
    notes: notes.trim() || undefined,
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...buildLocalChangeMetadata(timestamp),
  }

  await db.animals.add(animal)
  return animal
}

/**
 * Apply a partial update to an animal, stamping `updatedAt`. Returns the number
 * of records changed (0 when the animal no longer exists).
 */
export function updateAnimalRecord(
  animalId: string,
  patch: Partial<Pick<Animal, 'earTag' | 'species' | 'name' | 'notes' | 'isArchived'>>,
): Promise<number> {
  const timestamp = nowIso()
  return db.animals.update(animalId, {
    ...patch,
    updatedAt: timestamp,
    ...buildLocalChangePatch(timestamp),
  })
}

export function deleteAnimalRecord(animalId: string): Promise<void> {
  return db.animals.delete(animalId)
}
