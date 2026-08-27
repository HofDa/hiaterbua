import Dexie, { type Table } from 'dexie'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db/dexie'
import { defaultAppSettings } from '@/lib/settings/defaults'
import { buildSampleDataset } from '@/lib/import-export/sample-dataset.fixture'
import type {
  AppSettings,
  Enclosure,
  GrazingSession,
  Herd,
} from '@/types/domain'

// A handle to the database at schema version 3 — before the v5 enclosure-index
// change and the v8 settings-seed upgrade. Used to lay down "old install" data
// that the real `db` singleton must then upgrade in place.
class LegacyDbV3 extends Dexie {
  herds!: Table<Herd, string>
  enclosures!: Table<Enclosure, string>
  sessions!: Table<GrazingSession, string>
  settings!: Table<AppSettings, string>

  constructor() {
    super('hirtenapp-db')
    this.version(3).stores({
      herds: 'id, name, isArchived, updatedAt',
      animals: 'id, herdId, earTag, species, isArchived, updatedAt',
      enclosures: 'id, name, method, herdId, createdAt, updatedAt',
      surveyAreas: 'id, name, createdAt, updatedAt',
      enclosureAssignments: 'id, enclosureId, herdId, startTime, endTime, updatedAt',
      sessions: 'id, herdId, status, startTime, endTime, updatedAt',
      trackpoints: 'id, sessionId, enclosureWalkId, seq, timestamp, accepted',
      events: 'id, sessionId, timestamp, type',
      workSessions: 'id, type, status, herdId, enclosureId, startTime, endTime, updatedAt',
      workEvents: 'id, workSessionId, timestamp, type',
      settings: 'id',
    })
  }
}

const ISO = '2026-01-01T00:00:00.000Z'

function legacyHerd(): Herd {
  return {
    id: 'herd_legacy',
    name: 'Almherde',
    fallbackCount: null,
    isArchived: false,
    createdAt: ISO,
    updatedAt: ISO,
  }
}

function legacyEnclosure(): Enclosure {
  // The enclosure store gains rootEnclosureId/version/superseded* indices at v5,
  // so it's the meaningful table to prove data survives that index change.
  return {
    id: 'enclosure_legacy',
    name: 'Hauptpferch',
    method: 'draw',
    geometry: null,
    areaM2: 1234,
    areaHa: 0.1234,
    herdId: 'herd_legacy',
    createdAt: ISO,
    updatedAt: ISO,
  }
}

function legacySession(): GrazingSession {
  return {
    id: 'session_legacy',
    herdId: 'herd_legacy',
    animalCount: 30,
    status: 'finished',
    startTime: ISO,
    endTime: ISO,
    durationS: 60,
    movingTimeS: 30,
    distanceM: 120,
    avgSpeedMps: null,
    avgAccuracyM: null,
    createdAt: ISO,
    updatedAt: ISO,
  }
}

async function seedLegacyV3(seed: (legacy: LegacyDbV3) => Promise<void>) {
  const legacy = new LegacyDbV3()
  try {
    await legacy.open()
    await seed(legacy)
  } finally {
    // Close before the singleton opens, so its upgrade has exclusive access.
    legacy.close()
  }
}

beforeEach(async () => {
  db.close()
  await Dexie.delete('hirtenapp-db')
})

afterAll(() => {
  db.close()
})

describe('HirtenAppDB schema migration from v3', () => {
  it('upgrades a v3 install to the current schema, preserving records', async () => {
    await seedLegacyV3(async (legacy) => {
      await legacy.herds.add(legacyHerd())
      await legacy.enclosures.add(legacyEnclosure())
      await legacy.sessions.add(legacySession())
    })

    await db.open()

    expect(db.verno).toBe(15)
    expect(await db.herds.get('herd_legacy')).toEqual({
      ...legacyHerd(),
      deletedAt: null,
      deviceId: expect.stringMatching(/^device_/),
      syncStatus: 'dirty',
      lastLocalChangeAt: ISO,
    })
    expect(await db.enclosures.get('enclosure_legacy')).toEqual({
      ...legacyEnclosure(),
      deletedAt: null,
      deviceId: expect.stringMatching(/^device_/),
      syncStatus: 'dirty',
      lastLocalChangeAt: ISO,
    })
    expect(await db.conservationPlans.count()).toBe(0)
    expect(await db.careMonitoringChecks.count()).toBe(0)
    expect(db.careMonitoringChecks.schema.indexes.map((index) => index.name)).toContain(
      '[enclosureId+observedAt]',
    )
    expect(await db.sessions.get('session_legacy')).toEqual({
      ...legacySession(),
      deletedAt: null,
      deviceId: expect.stringMatching(/^device_/),
      syncStatus: 'dirty',
      lastLocalChangeAt: ISO,
    })
  })

  it('seeds default settings when the upgraded install had none', async () => {
    await seedLegacyV3(async (legacy) => {
      await legacy.herds.add(legacyHerd())
    })

    await db.open()

    expect(await db.settings.get('app')).toEqual(defaultAppSettings)
  })

  it('keeps existing settings instead of overwriting them with defaults', async () => {
    const storedSettings: AppSettings = {
      ...defaultAppSettings,
      userName: 'Hans Hofer',
      tileCachingEnabled: true,
    }

    await seedLegacyV3(async (legacy) => {
      await legacy.settings.add(storedSettings)
    })

    await db.open()

    expect(await db.settings.get('app')).toEqual(storedSettings)
  })

  it('upgrades a v12 install with legacy conservation plan through the v15 schema', async () => {
    const legacyPlan = {
      id: 'cp_legacy',
      enclosureId: 'enclosure_legacy',
      habitatType: 'semi_dry_grassland',
      goals: ['reduce_thatch', 'create_open_soil'],
      targetUsePercent: 50,
      protectedPlants: [{ name: 'Arnika' }, { name: 'Enzian' }],
      notes: 'Alter Plan',
      createdAt: ISO,
      updatedAt: ISO,
      deletedAt: null,
      deviceId: 'device_old',
      syncStatus: 'synced',
      lastLocalChangeAt: ISO,
    }

    await seedLegacyV12(async (legacy) => {
      await legacy.enclosures.add(legacyEnclosure() as unknown as Record<string, unknown>)
      await legacy.conservationPlans.add(legacyPlan)
    })

    await db.open()

    expect(db.verno).toBe(15)
    const migrated = await db.conservationPlans.get('cp_legacy')
    expect(migrated).toBeDefined()
    expect(migrated).toEqual({
      id: 'cp_legacy',
      enclosureId: 'enclosure_legacy',
      habitatType: 'semi_dry_grassland',
      vegetationUse: {
        targetPercent: 50,
        protectedPlants: ['Arnika', 'Enzian'],
        manualRemovalPlants: [],
      },
      litterReduction: {
        enabled: true,
      },
      scrubReduction: {
        targetPercent: null,
        protectedWoodyPlants: [],
        manualRemovalWoodyPlants: [],
      },
      openSoil: {
        mode: 'punctual_desired',
      },
      nutrientInput: {
        mode: 'desired',
      },
      notes: 'Alter Plan',
      createdAt: ISO,
      updatedAt: ISO,
      deletedAt: null,
      deviceId: 'device_old',
      syncStatus: 'synced',
      lastLocalChangeAt: ISO,
    })
    expect((migrated as unknown as Record<string, unknown>).targetUsePercent).toBeUndefined()
    expect((migrated as unknown as Record<string, unknown>).goals).toBeUndefined()
    expect((migrated as unknown as Record<string, unknown>).protectedPlants).toBeUndefined()
  })

  it('upgrades a v14 monitoring check with rules version and local metadata', async () => {
    const legacy = new LegacyDbV14()
    const rawCheck = structuredClone(
      buildSampleDataset().careMonitoringChecks[0],
    ) as unknown as Record<string, unknown>
    delete rawCheck.assessmentVersion
    delete rawCheck.deviceId
    delete rawCheck.syncStatus
    delete rawCheck.lastLocalChangeAt
    delete rawCheck.deletedAt
    try {
      await legacy.open()
      await legacy.careMonitoringChecks.add(rawCheck)
    } finally {
      legacy.close()
    }

    await db.open()
    const migrated = await db.careMonitoringChecks.get(String(rawCheck.id))
    expect(migrated).toMatchObject({
      assessmentVersion: 1,
      syncStatus: 'dirty',
      lastLocalChangeAt: rawCheck.updatedAt,
      deletedAt: null,
    })
    expect(migrated?.deviceId).toMatch(/^device_/)
  })
})

class LegacyDbV14 extends Dexie {
  careMonitoringChecks!: Table<Record<string, unknown>, string>

  constructor() {
    super('hirtenapp-db')
    this.version(14).stores({
      careMonitoringChecks:
        'id, enclosureId, conservationPlanId, grazingSessionId, observedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
    })
  }
}

class LegacyDbV12 extends Dexie {
  herds!: Table<Record<string, unknown>, string>
  enclosures!: Table<Record<string, unknown>, string>
  conservationPlans!: Table<Record<string, unknown>, string>

  constructor() {
    super('hirtenapp-db')
    this.version(12).stores({
      herds: 'id, name, isArchived, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      animals:
        'id, herdId, earTag, species, isArchived, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      enclosures:
        'id, name, method, herdId, rootEnclosureId, version, supersededAt, supersededByEnclosureId, createdAt, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      conservationPlans:
        'id, &enclosureId, habitatType, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      surveyAreas: 'id, name, createdAt, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      enclosureAssignments:
        'id, enclosureId, herdId, startTime, endTime, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      sessions:
        'id, herdId, status, startTime, endTime, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      trackpoints:
        'id, sessionId, enclosureWalkId, seq, timestamp, accepted, [sessionId+seq], syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      events: 'id, sessionId, timestamp, type, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      workSessions:
        'id, type, status, herdId, enclosureId, startTime, endTime, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      workEvents: 'id, workSessionId, timestamp, type, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      fieldDiagnostics: 'id, type, level, createdAt',
      settings: 'id',
    })
  }
}

async function seedLegacyV12(seed: (legacy: LegacyDbV12) => Promise<void>) {
  const legacy = new LegacyDbV12()
  try {
    await legacy.open()
    await seed(legacy)
  } finally {
    legacy.close()
  }
}
