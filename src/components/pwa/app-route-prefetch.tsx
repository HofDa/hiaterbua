'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const OFFLINE_PREFETCH_ROUTES = [
  '/',
  '/enclosures',
  '/export',
  '/herd',
  '/herd/edit',
  '/herds',
  '/session',
  '/sessions',
  '/settings',
  '/work',
] as const

export function AppRoutePrefetch() {
  const router = useRouter()

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return
    }

    let cancelled = false

    const runPrefetch = () => {
      if (cancelled) {
        return
      }

      for (const route of OFFLINE_PREFETCH_ROUTES) {
        try {
          router.prefetch(route)
        } catch {
          // Route prefetching is opportunistic and must not block the app.
        }
      }
    }

    if (typeof globalThis.requestIdleCallback === 'function') {
      const idleId = globalThis.requestIdleCallback(runPrefetch, { timeout: 2000 })

      return () => {
        cancelled = true
        globalThis.cancelIdleCallback?.(idleId)
      }
    }

    const timeoutId = globalThis.setTimeout(runPrefetch, 250)

    return () => {
      cancelled = true
      globalThis.clearTimeout(timeoutId)
    }
  }, [router])

  return null
}
