import type { BrowserNotificationPermissionState } from '@/lib/notifications/browser-notifications'

export function getWorkSessionStartedStatusMessage({
  reminderIntervalMin,
  notificationPermission,
}: {
  reminderIntervalMin: number
  notificationPermission: BrowserNotificationPermissionState
}) {
  if (reminderIntervalMin > 0 && notificationPermission !== 'granted') {
    return 'Arbeitseinsatz gestartet. Erinnerungen erscheinen in der App; Browser-Benachrichtigungen sind nicht aktiv.'
  }

  return 'Arbeitseinsatz gestartet.'
}
