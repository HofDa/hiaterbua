import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db/dexie'
import {
  assignHerdToEnclosureRecord,
  undoEnclosureAssignmentRecord,
} from '@/lib/db/repositories/enclosures'
import type { Enclosure } from '@/types/domain'

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

async function seedEnclosure(): Promise<Enclosure> {
  const now = new Date().toISOString()
  const enclosure = {
    id: 'enclosure_1',
    name: 'Pferch',
    method: 'draw',
    herdId: null,
    createdAt: now,
    updatedAt: now,
  } as unknown as Enclosure
  await db.enclosures.add(enclosure)
  return enclosure
}

describe('undoEnclosureAssignmentRecord', () => {
  it('removes the fresh assignment and restores the enclosure herd', async () => {
    const enclosure = await seedEnclosure()
    const assignmentId = await assignHerdToEnclosureRecord({
      enclosure,
      herdId: 'herd_1',
      count: 40,
      notes: '',
    })

    await undoEnclosureAssignmentRecord({ assignmentId, previousEnclosureHerdId: null })

    expect(await db.enclosureAssignments.get(assignmentId)).toBeUndefined()
    expect((await db.enclosures.get(enclosure.id))?.herdId).toBeNull()
  })

  it('refuses after the undo window', async () => {
    const enclosure = await seedEnclosure()
    const assignmentId = await assignHerdToEnclosureRecord({
      enclosure,
      herdId: 'herd_1',
      count: null,
      notes: '',
    })
    const late = new Date(Date.now() + 5 * 60_000).toISOString()

    await expect(
      undoEnclosureAssignmentRecord({ assignmentId, previousEnclosureHerdId: null, now: late })
    ).rejects.toThrow()
    expect(await db.enclosureAssignments.get(assignmentId)).toBeDefined()
  })
})
