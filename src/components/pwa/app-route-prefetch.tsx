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
    let cancelled = false
    let hasPrefetched = false
    let idleId: number | null = null
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null

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

    const schedulePrefetch = () => {
      if (cancelled || hasPrefetched) {
        return
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return
      }

      hasPrefetched = true

      if (typeof globalThis.requestIdleCallback === 'function') {
        idleId = globalThis.requestIdleCallback(runPrefetch, { timeout: 2000 })
        return
      }

      timeoutId = globalThis.setTimeout(runPrefetch, 250)
    }

    window.addEventListener('online', schedulePrefetch)
    schedulePrefetch()

    return () => {
      cancelled = true
      window.removeEventListener('online', schedulePrefetch)

      if (idleId !== null) {
        globalThis.cancelIdleCallback?.(idleId)
      }

      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId)
      }
    }
  }, [router])

  return null
}
