import { db } from '@/lib/db/dexie'
import { buildLocalChangeMetadata, buildLocalChangePatch } from '@/lib/sync/local-metadata'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type {
  ConservationPlan,
  HabitatType,
  NutrientInputMode,
  OpenSoilMode,
  TargetPercent,
} from '@/types/domain'

function cleanStringList(items?: string[]): string[] {
  if (!items) return []
  const result: string[] = []
  for (const item of items) {
    const trimmed = item.trim()
    if (trimmed && !result.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
      result.push(trimmed)
    }
  }
  return result
}

export type SaveConservationPlanParams = {
  enclosureId: string
  habitatType: HabitatType
  vegetationUse: {
    targetPercent: TargetPercent
    protectedPlants?: string[]
    manualRemovalPlants?: string[]
  }
  litterReduction?: {
    enabled: boolean
    note?: string
  }
  scrubReduction?: {
    targetPercent?: TargetPercent | null
    protectedWoodyPlants?: string[]
    manualRemovalWoodyPlants?: string[]
  }
  openSoil?: {
    mode?: OpenSoilMode
    maxPercent?: number
    note?: string
  }
  nutrientInput?: {
    mode?: NutrientInputMode
    note?: string
  }
  notes?: string
}

export function listAllConservationPlans(): Promise<ConservationPlan[]> {
  return db.conservationPlans.toArray()
}

export function getConservationPlanByEnclosureId(
  enclosureId: string,
): Promise<ConservationPlan | undefined> {
  return db.conservationPlans.where('enclosureId').equals(enclosureId).first()
}

export class ConservationPlanHasMonitoringHistoryError extends Error {
  constructor(planId: string) {
    super(`Pflegeplan "${planId}" kann wegen vorhandener Monitoringhistorie nicht gelöscht werden.`)
    this.name = 'ConservationPlanHasMonitoringHistoryError'
  }
}

export async function deleteConservationPlan(id: string): Promise<void> {
  await db.transaction('rw', db.conservationPlans, db.careMonitoringChecks, async () => {
    const historicalCheck = await db.careMonitoringChecks
      .where('conservationPlanId')
      .equals(id)
      .first()
    if (historicalCheck) {
      throw new ConservationPlanHasMonitoringHistoryError(id)
    }
    await db.conservationPlans.delete(id)
  })
}

export async function saveConservationPlan(params: SaveConservationPlanParams): Promise<ConservationPlan> {
  const enclosureId = params.enclosureId.trim()
  if (!enclosureId) {
    throw new Error('Pflegeplan braucht einen Pferch.')
  }

  const validPercents: TargetPercent[] = [25, 50, 75, 100]
  if (!validPercents.includes(params.vegetationUse.targetPercent)) {
    throw new Error('Ungültiger Zielprozentwert für die Krautschicht.')
  }

  if (
    params.scrubReduction?.targetPercent != null &&
    !validPercents.includes(params.scrubReduction.targetPercent)
  ) {
    throw new Error('Ungültiger Zielprozentwert für die Gehölzreduktion.')
  }

  const timestamp = nowIso()
  const vegetationUse = {
    targetPercent: params.vegetationUse.targetPercent,
    protectedPlants: cleanStringList(params.vegetationUse.protectedPlants),
    manualRemovalPlants: cleanStringList(params.vegetationUse.manualRemovalPlants),
  }
  const litterReduction = {
    enabled: Boolean(params.litterReduction?.enabled),
    note: params.litterReduction?.note?.trim() || undefined,
  }
  const scrubReduction = {
    targetPercent: params.scrubReduction?.targetPercent ?? null,
    protectedWoodyPlants: cleanStringList(params.scrubReduction?.protectedWoodyPlants),
    manualRemovalWoodyPlants: cleanStringList(params.scrubReduction?.manualRemovalWoodyPlants),
  }
  const openSoil = {
    mode: params.openSoil?.mode ?? 'not_desired',
    maxPercent: params.openSoil?.maxPercent,
    note: params.openSoil?.note?.trim() || undefined,
  }
  const nutrientInput = {
    mode: params.nutrientInput?.mode ?? 'avoid',
    note: params.nutrientInput?.note?.trim() || undefined,
  }
  const notes = params.notes?.trim() || undefined

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
        vegetationUse,
        litterReduction,
        scrubReduction,
        openSoil,
        nutrientInput,
        notes,
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
      vegetationUse,
      litterReduction,
      scrubReduction,
      openSoil,
      nutrientInput,
      notes,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...buildLocalChangeMetadata(timestamp),
    }

    await db.conservationPlans.add(created)
    return created
  })
}
