import Dexie from 'dexie'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db/dexie'
import { deleteEnclosureRecord } from '@/lib/db/repositories/enclosures'
import {
  getConservationPlanByEnclosureId,
  saveConservationPlan,
} from '@/lib/db/repositories/conservation-plans'
import type { Enclosure } from '@/types/domain'

const ISO = '2026-08-27T08:00:00.000Z'

function enclosure(): Enclosure {
  return {
    id: 'enclosure_care',
    name: 'Pflegefläche',
    method: 'draw',
    geometry: null,
    areaM2: 10_000,
    areaHa: 1,
    createdAt: ISO,
    updatedAt: ISO,
  }
}

beforeEach(async () => {
  db.close()
  await Dexie.delete('hirtenapp-db')
  await db.open()
  await db.enclosures.add(enclosure())
})

afterAll(() => {
  db.close()
})

describe('conservation plan repository', () => {
  it('creates and then updates the single plan for an enclosure', async () => {
    const created = await saveConservationPlan({
      enclosureId: 'enclosure_care',
      habitatType: 'semi_dry_grassland',
      goals: ['use_grass_herbs', 'protect_plants'],
      targetUsePercent: 75,
      protectedPlants: [{ name: ' Arnika ' }],
    })

    const updated = await saveConservationPlan({
      enclosureId: 'enclosure_care',
      habitatType: 'dry_grassland',
      goals: ['keep_structure', 'keep_structure'],
      targetUsePercent: 50,
      protectedPlants: [{ name: 'Enzian' }],
    })

    expect(updated.id).toBe(created.id)
    expect(await db.conservationPlans.count()).toBe(1)
    expect(await getConservationPlanByEnclosureId('enclosure_care')).toMatchObject({
      id: created.id,
      enclosureId: 'enclosure_care',
      habitatType: 'dry_grassland',
      goals: ['keep_structure'],
      targetUsePercent: 50,
      protectedPlants: [{ name: 'Enzian' }],
      syncStatus: 'dirty',
    })
  })

  it('removes the plan when its enclosure is deleted', async () => {
    await saveConservationPlan({
      enclosureId: 'enclosure_care',
      habitatType: 'semi_dry_grassland',
      goals: ['keep_structure'],
      targetUsePercent: 75,
      protectedPlants: [],
    })

    await deleteEnclosureRecord('enclosure_care')

    expect(await db.conservationPlans.count()).toBe(0)
  })

  it('refuses to create a plan for a missing enclosure', async () => {
    await expect(
      saveConservationPlan({
        enclosureId: 'missing',
        habitatType: 'semi_dry_grassland',
        goals: ['use_grass_herbs'],
        targetUsePercent: 75,
        protectedPlants: [],
      }),
    ).rejects.toThrow(/Pferch/)
  })
})
