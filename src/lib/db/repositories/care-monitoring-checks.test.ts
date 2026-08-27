import Dexie from 'dexie'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { evaluateCareAssessment } from '@/lib/care/care-assessment'
import { db } from '@/lib/db/dexie'
import {
  createCareMonitoringCheck,
  getCareMonitoringCheck,
  listCareMonitoringChecksForEnclosure,
} from '@/lib/db/repositories/care-monitoring-checks'
import {
  deleteConservationPlan,
  saveConservationPlan,
} from '@/lib/db/repositories/conservation-plans'
import { deleteEnclosureRecord } from '@/lib/db/repositories/enclosures'
import { deleteGrazingSessionRecord } from '@/lib/db/repositories/sessions'
import type {
  CareMonitoringCheck,
  ConservationPlan,
  Enclosure,
  GrazingSession,
} from '@/types/domain'

const ISO = '2027-07-01T08:00:00.000Z'

function enclosure(id = 'enclosure_care'): Enclosure {
  return {
    id,
    name: 'Monitoringfläche',
    method: 'draw',
    geometry: null,
    areaM2: 10_000,
    areaHa: 1,
    createdAt: ISO,
    updatedAt: ISO,
  }
}

async function createPlan(params?: {
  enclosureId?: string
  vegetationPercent?: 25 | 50 | 75 | 100
  scrubPercent?: 25 | 50 | 75 | 100 | null
}): Promise<ConservationPlan> {
  return saveConservationPlan({
    enclosureId: params?.enclosureId ?? 'enclosure_care',
    habitatType: 'semi_dry_grassland',
    vegetationUse: {
      targetPercent: params?.vegetationPercent ?? 75,
      protectedPlants: ['Arnika'],
      manualRemovalPlants: ['Weißer Germer'],
    },
    litterReduction: {
      enabled: true,
      note: 'Filz reduzieren',
    },
    scrubReduction: {
      targetPercent: params?.scrubPercent === undefined ? 25 : params.scrubPercent,
      protectedWoodyPlants: ['Wacholder'],
      manualRemovalWoodyPlants: ['Robinie'],
    },
    openSoil: {
      mode: 'not_desired',
      maxPercent: 5,
    },
    nutrientInput: {
      mode: 'avoid',
    },
  })
}

function completeObservations(): CareMonitoringCheck['observations'] {
  return {
    vegetationUse: 'too_low',
    litterReduction: 'fits',
    scrubReduction: 'fits',
    openSoil: null,
    traffic: 'spotty',
    nutrientConcentration: 'localized',
    protectedPlants: 'none',
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

describe('care monitoring check repository', () => {
  it('persists observations and the deterministic rules-engine assessment', async () => {
    const plan = await createPlan()
    const observations = completeObservations()

    const created = await createCareMonitoringCheck({
      conservationPlanId: plan.id,
      enclosureId: plan.enclosureId,
      observedAt: ISO,
      observations,
      note: ' Nachkontrolle ',
    })

    const expected = evaluateCareAssessment({
      habitatType: plan.habitatType,
      use: observations.vegetationUse,
      litter: observations.litterReduction,
      scrub: observations.scrubReduction,
      openSoil: observations.openSoil,
      traffic: observations.traffic,
      nutrients: observations.nutrientConcentration,
      protectedPlants: observations.protectedPlants,
      vegetationUse: plan.vegetationUse,
      litterReduction: plan.litterReduction,
      scrubReduction: plan.scrubReduction,
      openSoilTarget: plan.openSoil,
      nutrientInput: plan.nutrientInput,
    })
    const stored = await getCareMonitoringCheck(created.id)

    expect(stored?.observations).toEqual(observations)
    expect(stored?.assessmentVersion).toBe(1)
    expect(stored?.assessment).toEqual({
      status: expected.status,
      findings: expected.findings,
      actions: expected.actions,
    })
    expect(stored).toMatchObject({
      note: 'Nachkontrolle',
      syncStatus: 'dirty',
      deviceId: expect.stringMatching(/^device_/),
    })
  })

  it('stores an immutable five-area plan snapshot with separate vegetation and scrub values', async () => {
    const plan = await createPlan({ vegetationPercent: 75, scrubPercent: 25 })
    const created = await createCareMonitoringCheck({
      conservationPlanId: plan.id,
      enclosureId: plan.enclosureId,
      observations: completeObservations(),
    })

    expect(created.planSnapshot).toEqual({
      habitatType: plan.habitatType,
      vegetationUse: plan.vegetationUse,
      litterReduction: plan.litterReduction,
      scrubReduction: plan.scrubReduction,
      openSoil: plan.openSoil,
      nutrientInput: plan.nutrientInput,
    })
    expect(created.planSnapshot.vegetationUse.targetPercent).toBe(75)
    expect(created.planSnapshot.scrubReduction.targetPercent).toBe(25)

    await createPlan({ vegetationPercent: 50, scrubPercent: 50 })

    const historical = await getCareMonitoringCheck(created.id)
    expect(historical?.planSnapshot.vegetationUse.targetPercent).toBe(75)
    expect(historical?.planSnapshot.scrubReduction.targetPercent).toBe(25)
  })

  it('lists checks for one enclosure newest-first', async () => {
    const plan = await createPlan()
    await createCareMonitoringCheck({
      conservationPlanId: plan.id,
      enclosureId: plan.enclosureId,
      observedAt: '2027-01-01T08:00:00.000Z',
      observations: completeObservations(),
    })
    await createCareMonitoringCheck({
      conservationPlanId: plan.id,
      enclosureId: plan.enclosureId,
      observedAt: '2027-06-01T08:00:00.000Z',
      observations: completeObservations(),
    })

    const checks = await listCareMonitoringChecksForEnclosure(plan.enclosureId)
    expect(checks.map((check) => check.observedAt)).toEqual([
      '2027-06-01T08:00:00.000Z',
      '2027-01-01T08:00:00.000Z',
    ])
  })

  it('uses deterministic ID ordering for equal observation timestamps', async () => {
    const plan = await createPlan()
    const first = await createCareMonitoringCheck({
      conservationPlanId: plan.id,
      enclosureId: plan.enclosureId,
      observedAt: ISO,
      observations: completeObservations(),
    })
    const second = await createCareMonitoringCheck({
      conservationPlanId: plan.id,
      enclosureId: plan.enclosureId,
      observedAt: ISO,
      observations: completeObservations(),
    })
    const checks = await listCareMonitoringChecksForEnclosure(plan.enclosureId)
    expect(checks.map((check) => check.id)).toEqual([first.id, second.id].sort())
  })

  it('accepts a missing optional grazingSessionId', async () => {
    const plan = await createPlan()
    const created = await createCareMonitoringCheck({
      conservationPlanId: plan.id,
      enclosureId: plan.enclosureId,
      observations: completeObservations(),
    })

    expect(created.grazingSessionId).toBeNull()
  })

  it('rejects missing and mismatched enclosure references', async () => {
    const plan = await createPlan()
    await db.enclosures.add(enclosure('enclosure_other'))

    await expect(
      createCareMonitoringCheck({
        conservationPlanId: plan.id,
        enclosureId: 'missing',
        observations: completeObservations(),
      }),
    ).rejects.toThrow(/Pferch/)

    await expect(
      createCareMonitoringCheck({
        conservationPlanId: plan.id,
        enclosureId: 'enclosure_other',
        observations: completeObservations(),
      }),
    ).rejects.toThrow(/gehören nicht zusammen/)
  })

  it('rejects an invalid ConservationPlan reference', async () => {
    await expect(
      createCareMonitoringCheck({
        conservationPlanId: 'missing_plan',
        enclosureId: 'enclosure_care',
        observations: completeObservations(),
      }),
    ).rejects.toThrow(/Pflegeplan/)
  })

  it('does not create a check from incomplete required observations', async () => {
    const plan = await createPlan()
    const incomplete = completeObservations()
    incomplete.vegetationUse = null

    await expect(
      createCareMonitoringCheck({
        conservationPlanId: plan.id,
        enclosureId: plan.enclosureId,
        observations: incomplete,
      }),
    ).rejects.toThrow(/unvollständig/)
    expect(await db.careMonitoringChecks.count()).toBe(0)
  })

  it('blocks enclosure/plan cascade deletion while monitoring history exists', async () => {
    const plan = await createPlan()
    const check = await createCareMonitoringCheck({
      conservationPlanId: plan.id,
      enclosureId: plan.enclosureId,
      observations: completeObservations(),
    })

    await expect(deleteEnclosureRecord(plan.enclosureId)).rejects.toThrow(/Pflegechecks/)
    await expect(db.enclosures.get(plan.enclosureId)).resolves.toBeDefined()
    await expect(db.conservationPlans.get(plan.id)).resolves.toBeDefined()
    await expect(db.careMonitoringChecks.get(check.id)).resolves.toBeDefined()
  })

  it('allows direct deletion only while a conservation plan is unreferenced', async () => {
    const unreferenced = await createPlan()
    await deleteConservationPlan(unreferenced.id)
    await expect(db.conservationPlans.get(unreferenced.id)).resolves.toBeUndefined()

    const referenced = await createPlan()
    const check = await createCareMonitoringCheck({
      conservationPlanId: referenced.id,
      enclosureId: referenced.enclosureId,
      observations: completeObservations(),
    })
    await expect(deleteConservationPlan(referenced.id)).rejects.toThrow(/Monitoringhistorie/)
    await expect(db.conservationPlans.get(referenced.id)).resolves.toBeDefined()
    await expect(db.careMonitoringChecks.get(check.id)).resolves.toBeDefined()
  })

  it('blocks deletion of a grazing session referenced by monitoring history', async () => {
    const plan = await createPlan()
    const session: GrazingSession = {
      id: 'session_care',
      herdId: 'herd_care',
      status: 'finished',
      startTime: ISO,
      endTime: ISO,
      durationS: 0,
      movingTimeS: 0,
      distanceM: 0,
      createdAt: ISO,
      updatedAt: ISO,
    }
    await db.sessions.add(session)
    await createCareMonitoringCheck({
      conservationPlanId: plan.id,
      enclosureId: plan.enclosureId,
      grazingSessionId: session.id,
      observations: completeObservations(),
    })

    await expect(deleteGrazingSessionRecord(session.id)).rejects.toThrow(/Pflegecheck/)
    await expect(db.sessions.get(session.id)).resolves.toBeDefined()
  })
})
