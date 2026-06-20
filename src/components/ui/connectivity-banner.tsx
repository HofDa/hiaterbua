'use client'

import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'
import { StatusAlert } from './alert'

export function ConnectivityBanner() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const handleStatus = () => setIsOffline(!navigator.onLine)

    window.addEventListener('online', handleStatus)
    window.addEventListener('offline', handleStatus)
    handleStatus()

    return () => {
      window.removeEventListener('online', handleStatus)
      window.removeEventListener('offline', handleStatus)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="pointer-events-none fixed bottom-[calc(var(--app-bottom-nav-height)+env(safe-area-inset-bottom)+0.75rem)] left-3 right-3 z-50 animate-in fade-in slide-in-from-bottom-4 md:bottom-4 md:left-4 md:right-4">
      <StatusAlert variant="warning" icon={<WifiOff className="h-4 w-4" />}>
        Offline – Änderungen werden lokal gespeichert.
      </StatusAlert>
    </div>
  )
}
