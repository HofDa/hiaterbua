import { describe, expect, it } from 'vitest'
import { getWorkSessionStartedStatusMessage } from '@/lib/work/work-session-notifications'

describe('getWorkSessionStartedStatusMessage', () => {
  it('keeps the normal start message when no reminder is configured', () => {
    expect(
      getWorkSessionStartedStatusMessage({
        reminderIntervalMin: 0,
        notificationPermission: 'default',
      })
    ).toBe('Arbeitseinsatz gestartet.')
  })

  it('keeps the normal start message when browser notifications are granted', () => {
    expect(
      getWorkSessionStartedStatusMessage({
        reminderIntervalMin: 30,
        notificationPermission: 'granted',
      })
    ).toBe('Arbeitseinsatz gestartet.')
  })

  it('uses a non-blocking status message when reminders stay in-app only', () => {
    expect(
      getWorkSessionStartedStatusMessage({
        reminderIntervalMin: 30,
        notificationPermission: 'default',
      })
    ).toBe(
      'Arbeitseinsatz gestartet. Erinnerungen erscheinen in der App; Browser-Benachrichtigungen sind nicht aktiv.'
    )
  })
})
