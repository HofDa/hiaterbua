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
    <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4">
      <StatusAlert variant="warning" icon={<WifiOff className="h-4 w-4" />}>
        Offline – Änderungen werden lokal gespeichert.
      </StatusAlert>
    </div>
  )
}
