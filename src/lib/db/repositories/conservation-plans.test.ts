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
  it('creates and then updates the single plan with independent vegetation and scrub targets', async () => {
    const created = await saveConservationPlan({
      enclosureId: 'enclosure_care',
      habitatType: 'semi_dry_grassland',
      vegetationUse: {
        targetPercent: 75,
        protectedPlants: [' Arnika ', 'Arnika'],
        manualRemovalPlants: ['Jakobskreuzkraut'],
      },
      litterReduction: {
        enabled: true,
        note: 'Altes Gras verfilzt',
      },
      scrubReduction: {
        targetPercent: 25,
        protectedWoodyPlants: [' Wacholder '],
        manualRemovalWoodyPlants: ['Traubenkirsche'],
      },
      openSoil: {
        mode: 'punctual_desired',
        maxPercent: 5,
      },
      nutrientInput: {
        mode: 'avoid',
      },
      notes: 'Initialer Plan',
    })

    expect(created.vegetationUse.targetPercent).toBe(75)
    expect(created.scrubReduction.targetPercent).toBe(25)
    expect(created.vegetationUse.protectedPlants).toEqual(['Arnika'])
    expect(created.scrubReduction.protectedWoodyPlants).toEqual(['Wacholder'])

    const updated = await saveConservationPlan({
      enclosureId: 'enclosure_care',
      habitatType: 'dry_grassland',
      vegetationUse: {
        targetPercent: 50,
        protectedPlants: ['Enzian'],
      },
      scrubReduction: {
        targetPercent: 100,
        protectedWoodyPlants: [],
      },
      openSoil: {
        mode: 'not_desired',
      },
    })

    expect(updated.id).toBe(created.id)
    expect(await db.conservationPlans.count()).toBe(1)
    const stored = await getConservationPlanByEnclosureId('enclosure_care')
    expect(stored).toMatchObject({
      id: created.id,
      enclosureId: 'enclosure_care',
      habitatType: 'dry_grassland',
      vegetationUse: {
        targetPercent: 50,
        protectedPlants: ['Enzian'],
        manualRemovalPlants: [],
      },
      scrubReduction: {
        targetPercent: 100,
        protectedWoodyPlants: [],
        manualRemovalWoodyPlants: [],
      },
      openSoil: {
        mode: 'not_desired',
      },
      nutrientInput: {
        mode: 'avoid',
      },
      syncStatus: 'dirty',
    })
  })

  it('removes the plan when its enclosure is deleted', async () => {
    await saveConservationPlan({
      enclosureId: 'enclosure_care',
      habitatType: 'semi_dry_grassland',
      vegetationUse: {
        targetPercent: 75,
      },
    })

    await deleteEnclosureRecord('enclosure_care')

    expect(await db.conservationPlans.count()).toBe(0)
  })

  it('refuses to create a plan for a missing enclosure', async () => {
    await expect(
      saveConservationPlan({
        enclosureId: 'missing',
        habitatType: 'semi_dry_grassland',
        vegetationUse: {
          targetPercent: 75,
        },
      }),
    ).rejects.toThrow(/Pferch/)
  })
})
