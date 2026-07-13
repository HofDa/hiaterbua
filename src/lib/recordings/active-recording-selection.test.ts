import { describe, expect, it } from 'vitest'
import { selectActiveRecordingSource } from './active-recording-selection'
import type { GrazingSession, WorkSession } from '@/types/domain'

function grazingSession(
  id: string,
  status: GrazingSession['status'],
  startTime: string,
): GrazingSession {
  return {
    id,
    herdId: 'herd_1',
    status,
    startTime,
    endTime: null,
    durationS: 0,
    movingTimeS: 0,
    distanceM: 0,
    createdAt: startTime,
    updatedAt: startTime,
  }
}

function workSession(
  id: string,
  status: WorkSession['status'],
  startTime: string,
): WorkSession {
  return {
    id,
    type: 'herding',
    status,
    startTime,
    endTime: null,
    activeSince: status === 'active' ? startTime : null,
    durationS: 0,
    createdAt: startTime,
    updatedAt: startTime,
  }
}

describe('selectActiveRecordingSource', () => {
  it('shows active work instead of a paused grazing session', () => {
    const selected = selectActiveRecordingSource(
      [grazingSession('grazing_paused', 'paused', '2026-07-13T08:00:00.000Z')],
      [workSession('work_active', 'active', '2026-07-13T09:00:00.000Z')],
    )

    expect(selected).toMatchObject({ kind: 'work', recording: { id: 'work_active' } })
  })

  it('keeps grazing priority when both recordings are active', () => {
    const selected = selectActiveRecordingSource(
      [grazingSession('grazing_active', 'active', '2026-07-13T08:00:00.000Z')],
      [workSession('work_active', 'active', '2026-07-13T09:00:00.000Z')],
    )

    expect(selected).toMatchObject({ kind: 'grazing', recording: { id: 'grazing_active' } })
  })

  it('keeps grazing priority when both recordings are paused', () => {
    const selected = selectActiveRecordingSource(
      [grazingSession('grazing_paused', 'paused', '2026-07-13T08:00:00.000Z')],
      [workSession('work_paused', 'paused', '2026-07-13T09:00:00.000Z')],
    )

    expect(selected).toMatchObject({ kind: 'grazing', recording: { id: 'grazing_paused' } })
  })

  it('selects the newest active recording within one type', () => {
    const selected = selectActiveRecordingSource(
      [
        grazingSession('older', 'active', '2026-07-13T08:00:00.000Z'),
        grazingSession('newer', 'active', '2026-07-13T10:00:00.000Z'),
        grazingSession('paused', 'paused', '2026-07-13T11:00:00.000Z'),
      ],
      [],
    )

    expect(selected).toMatchObject({ kind: 'grazing', recording: { id: 'newer' } })
  })

  it('returns null when there are no running or paused recordings', () => {
    expect(
      selectActiveRecordingSource(
        [grazingSession('finished', 'finished', '2026-07-13T08:00:00.000Z')],
        [workSession('finished', 'finished', '2026-07-13T09:00:00.000Z')],
      ),
    ).toBeNull()
  })
})
