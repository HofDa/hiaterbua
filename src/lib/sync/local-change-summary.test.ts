import Dexie from 'dexie'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db/dexie'
import { getLocalChangeSummary } from '@/lib/sync/local-change-summary'
import type { ConservationPlan } from '@/types/domain'

const CHANGED_AT = '2026-08-27T10:00:00.000Z'

beforeEach(async () => {
  db.close()
  await Dexie.delete('hirtenapp-db')
  await db.open()
})

afterAll(() => {
  db.close()
})

describe('local change summary', () => {
  it('includes conservation plans in backup-change detection', async () => {
    const plan: ConservationPlan = {
      id: 'conservation_plan_backup',
      enclosureId: 'enclosure_backup',
      habitatType: 'semi_dry_grassland',
      goals: ['keep_structure'],
      targetUsePercent: 75,
      protectedPlants: [],
      createdAt: CHANGED_AT,
      updatedAt: CHANGED_AT,
      deletedAt: null,
      deviceId: 'device_test',
      syncStatus: 'dirty',
      lastLocalChangeAt: CHANGED_AT,
    }

    await db.conservationPlans.add(plan)

    await expect(getLocalChangeSummary()).resolves.toEqual({
      recordCount: 1,
      dirtyCount: 1,
      latestLocalChangeAt: CHANGED_AT,
    })
  })
})
