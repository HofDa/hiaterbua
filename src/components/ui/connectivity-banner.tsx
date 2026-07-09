'use client'

import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

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
    <div className="pointer-events-none fixed bottom-[calc(var(--app-bottom-nav-height)+var(--app-recording-bar-height)+env(safe-area-inset-bottom)+0.75rem)] left-0 right-0 z-50 flex justify-center animate-in fade-in slide-in-from-bottom-4 md:bottom-[calc(var(--app-recording-bar-height)+1rem)]">
      <div
        role="status"
        className="flex items-center gap-1.5 rounded-full border border-warning-border bg-warning-surface/90 px-3 py-1.5 text-xs font-medium text-warning-ink shadow-sm backdrop-blur-sm"
      >
        <WifiOff className="h-3.5 w-3.5" />
        Offline – wird lokal gespeichert
      </div>
    </div>
  )
}
