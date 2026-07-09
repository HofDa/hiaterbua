import { afterEach, describe, expect, it, vi } from 'vitest'
import { getBrowserNotificationPermission } from '@/lib/notifications/browser-notifications'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getBrowserNotificationPermission', () => {
  it('reads permission state without requesting browser permission', () => {
    const requestPermission = vi.fn()

    vi.stubGlobal('window', {
      Notification: {
        permission: 'default',
        requestPermission,
      },
    })

    expect(getBrowserNotificationPermission()).toBe('default')
    expect(requestPermission).not.toHaveBeenCalled()
  })

  it('reports unsupported when Notification is unavailable', () => {
    vi.stubGlobal('window', {})

    expect(getBrowserNotificationPermission()).toBe('unsupported')
  })
})
