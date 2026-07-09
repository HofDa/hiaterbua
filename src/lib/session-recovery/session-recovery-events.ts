import { addGrazingSessionEventRecord } from '@/lib/db/repositories/sessions'
import { addWorkEvent } from '@/lib/work/work-session-persistence'
import type { RecoverableSession } from '@/lib/session-recovery/session-recovery-state'

export async function logSessionRecoveryEvent(
  session: Pick<RecoverableSession, 'kind' | 'id'>,
  message: string
) {
  const comment = `System: ${message}`

  if (session.kind === 'grazing') {
    await addGrazingSessionEventRecord({
      sessionId: session.id,
      type: 'note',
      position: null,
      comment,
    })
    return
  }

  await addWorkEvent(session.id, 'note', comment)
}
