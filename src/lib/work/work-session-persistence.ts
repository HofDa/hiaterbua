import { db } from '@/lib/db/dexie'
import { buildLocalChangeMetadata } from '@/lib/sync/local-metadata'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type { WorkEvent } from '@/types/domain'

export async function addWorkEvent(
  workSessionId: string,
  type: WorkEvent['type'],
  comment?: string
) {
  const timestamp = nowIso()
  await db.workEvents.add({
    id: createId('work_event'),
    workSessionId,
    timestamp,
    type,
    comment: comment?.trim() || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...buildLocalChangeMetadata(timestamp),
  })
}
