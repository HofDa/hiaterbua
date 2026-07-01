import Dexie, { type Table } from 'dexie'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db/dexie'
import { defaultAppSettings } from '@/lib/settings/defaults'
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

    expect(db.verno).toBe(8)
    expect(await db.herds.get('herd_legacy')).toEqual(legacyHerd())
    expect(await db.enclosures.get('enclosure_legacy')).toEqual(legacyEnclosure())
    expect(await db.sessions.get('session_legacy')).toEqual(legacySession())
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
})
