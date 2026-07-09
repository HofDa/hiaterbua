'use client'

import { useEffect } from 'react'
import { recordFieldDiagnostic } from '@/lib/diagnostics/field-diagnostics'
import { getBrowserNotificationPermission } from '@/lib/notifications/browser-notifications'

export function FieldDiagnosticsRuntime() {
  useEffect(() => {
    let cancelled = false
    const recordConnectivity = (type: 'online' | 'offline') => {
      recordFieldDiagnostic({
        type,
        level: type === 'offline' ? 'warning' : 'info',
        message: type === 'offline' ? 'Browser ist offline gegangen.' : 'Browser ist wieder online.',
      })
    }

    const handleVisibilityChange = () => {
      recordFieldDiagnostic({
        type: 'visibilitychange',
        message: `Sichtbarkeit geändert: ${document.visibilityState}.`,
        details: { visibilityState: document.visibilityState },
      })
    }

    const handlePageHide = (event: PageTransitionEvent) => {
      recordFieldDiagnostic({
        type: 'pagehide',
        message: 'Seite wurde ausgeblendet.',
        details: { persisted: event.persisted },
      })
    }

    const handlePageShow = (event: PageTransitionEvent) => {
      recordFieldDiagnostic({
        type: 'pageshow',
        message: 'Seite wurde angezeigt.',
        details: { persisted: event.persisted },
      })
    }

    const handleRuntimeError = (event: ErrorEvent) => {
      recordFieldDiagnostic({
        type: 'runtime_error',
        level: 'error',
        message: event.message || 'Unbehandelter Laufzeitfehler.',
        details: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error,
        },
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      recordFieldDiagnostic({
        type: 'unhandled_promise_rejection',
        level: 'error',
        message: 'Unbehandelte Promise-Ablehnung.',
        details: event.reason,
      })
    }

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const data = event.data
      if (!data || typeof data !== 'object') return
      if ((data as { type?: unknown }).type !== 'FIELD_DIAGNOSTIC') return

      const diagnostic = data as {
        diagnostic?: {
          type?: unknown
          level?: unknown
          message?: unknown
          details?: unknown
        }
      }
      const payload = diagnostic.diagnostic
      if (!payload || typeof payload.type !== 'string' || typeof payload.message !== 'string') {
        return
      }

      recordFieldDiagnostic({
        type: payload.type,
        level:
          payload.level === 'warning' || payload.level === 'error' || payload.level === 'info'
            ? payload.level
            : 'info',
        message: payload.message,
        details: payload.details,
      })
    }

    const handleOnline = () => recordConnectivity('online')
    const handleOffline = () => recordConnectivity('offline')
    let handleNotificationPermissionChange: (() => void) | null = null

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('error', handleRuntimeError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage)

    recordFieldDiagnostic({
      type: 'notification_permission_status',
      message: `Benachrichtigungsstatus: ${getBrowserNotificationPermission()}.`,
      details: { permission: getBrowserNotificationPermission() },
    })

    let notificationPermissionStatus: PermissionStatus | null = null
    void navigator.permissions
      ?.query({ name: 'notifications' as PermissionName })
      .then((status) => {
        if (cancelled) return
        notificationPermissionStatus = status
        handleNotificationPermissionChange = () => {
          recordFieldDiagnostic({
            type: 'notification_permission_status_changed',
            level: status.state === 'denied' ? 'warning' : 'info',
            message: `Benachrichtigungsstatus geändert: ${status.state}.`,
            details: { permission: status.state },
          })
        }
        status.addEventListener('change', handleNotificationPermissionChange)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener('error', handleRuntimeError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage)
      if (notificationPermissionStatus && handleNotificationPermissionChange) {
        notificationPermissionStatus.removeEventListener(
          'change',
          handleNotificationPermissionChange
        )
      }
    }
  }, [])

  return null
}
