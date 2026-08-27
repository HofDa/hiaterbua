import { db } from '@/lib/db/dexie'
import { buildLocalChangeMetadata, buildLocalChangePatch } from '@/lib/sync/local-metadata'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type {
  CareGoalId,
  CarePlantReference,
  CareTargetUsePercent,
  ConservationPlan,
  HabitatType,
} from '@/types/domain'

export function listAllConservationPlans(): Promise<ConservationPlan[]> {
  return db.conservationPlans.toArray()
}

export function getConservationPlanByEnclosureId(
  enclosureId: string,
): Promise<ConservationPlan | undefined> {
  return db.conservationPlans.where('enclosureId').equals(enclosureId).first()
}

export async function saveConservationPlan(params: {
  enclosureId: string
  habitatType: HabitatType
  goals: CareGoalId[]
  targetUsePercent: CareTargetUsePercent
  protectedPlants: CarePlantReference[]
  notes?: string
}): Promise<ConservationPlan> {
  const enclosureId = params.enclosureId.trim()
  if (!enclosureId) {
    throw new Error('Pflegeplan braucht einen Pferch.')
  }

  if (params.goals.length === 0) {
    throw new Error('Pflegeplan braucht mindestens ein Pflegeziel.')
  }

  const timestamp = nowIso()
  const goals = [...new Set(params.goals)]
  const protectedPlants = params.protectedPlants
    .map((plant) => ({ name: plant.name.trim() }))
    .filter((plant) => plant.name.length > 0)
    .filter(
      (plant, index, all) =>
        all.findIndex((candidate) => candidate.name.toLocaleLowerCase() === plant.name.toLocaleLowerCase()) ===
        index,
    )

  return db.transaction('rw', db.enclosures, db.conservationPlans, async () => {
    const enclosure = await db.enclosures.get(enclosureId)
    if (!enclosure || enclosure.deletedAt) {
      throw new Error('Der ausgewählte Pferch wurde nicht gefunden.')
    }

    const existing = await getConservationPlanByEnclosureId(enclosureId)

    if (existing) {
      const updated: ConservationPlan = {
        ...existing,
        habitatType: params.habitatType,
        goals,
        targetUsePercent: params.targetUsePercent,
        protectedPlants,
        notes: params.notes?.trim() || undefined,
        updatedAt: timestamp,
        ...buildLocalChangePatch(timestamp),
      }
      await db.conservationPlans.put(updated)
      return updated
    }

    const created: ConservationPlan = {
      id: createId('conservation_plan'),
      enclosureId,
      habitatType: params.habitatType,
      goals,
      targetUsePercent: params.targetUsePercent,
      protectedPlants,
      notes: params.notes?.trim() || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...buildLocalChangeMetadata(timestamp),
    }

    await db.conservationPlans.add(created)
    return created
  })
}
