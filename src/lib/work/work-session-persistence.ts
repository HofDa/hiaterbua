import { db } from '@/lib/db/dexie'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type { WorkEvent } from '@/types/domain'

export async function addWorkEvent(
  workSessionId: string,
  type: WorkEvent['type'],
  comment?: string
) {
  await db.workEvents.add({
    id: createId('work_event'),
    workSessionId,
    timestamp: nowIso(),
    type,
    comment: comment?.trim() || undefined,
  })
}
