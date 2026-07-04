import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

type ServiceWorkerEventHandler = (event: { waitUntil: (promise: Promise<unknown>) => void }) => void

function readPublicScript(pathname: string) {
  return readFileSync(resolve(process.cwd(), 'public', pathname.replace(/^\//, '')), 'utf8')
}

describe('service-worker activation', () => {
  it('deletes the legacy tile cache while keeping the active app shell cache', async () => {
    const handlers = new Map<string, ServiceWorkerEventHandler>()
    const deletedCaches: string[] = []
    const workerScope = {
      __PASTORE_SW__: undefined,
      __PWA_PRECACHE_MANIFEST: undefined,
      location: { origin: 'https://app.test' },
      clients: {
        claim: vi.fn(async () => undefined),
      },
      addEventListener: vi.fn((type: string, handler: ServiceWorkerEventHandler) => {
        handlers.set(type, handler)
      }),
      skipWaiting: vi.fn(async () => undefined),
    }
    const context = vm.createContext({
      self: workerScope,
      caches: {
        keys: vi.fn(async () => [
          'hirtenapp-map-tiles-v1',
          'pastore-app-shell-dev',
          'pastore-app-shell-old',
        ]),
        delete: vi.fn(async (cacheName: string) => {
          deletedCaches.push(cacheName)
          return true
        }),
      },
      indexedDB,
      Request,
      Response,
      Blob,
      Headers,
      URL,
      fetch: vi.fn(),
      setTimeout,
      clearTimeout,
    })

    context.importScripts = vi.fn((...pathnames: string[]) => {
      pathnames.forEach((pathname) => {
        if (pathname === '/pwa-precache-manifest.js') {
          throw new Error('No generated manifest in test.')
        }

        vm.runInContext(readPublicScript(pathname), context, { filename: pathname })
      })
    })

    vm.runInContext(readPublicScript('/sw.js'), context, { filename: 'public/sw.js' })

    const activateHandler = handlers.get('activate')
    if (!activateHandler) {
      throw new Error('Activate handler was not registered.')
    }

    let activationPromise: Promise<unknown> | null = null
    activateHandler({
      waitUntil(promise) {
        activationPromise = promise
      },
    })

    await activationPromise

    expect(deletedCaches.sort()).toEqual([
      'hirtenapp-map-tiles-v1',
      'pastore-app-shell-old',
    ])
    expect(workerScope.clients.claim).toHaveBeenCalledOnce()
  })
})
