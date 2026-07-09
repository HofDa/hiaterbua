import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'
import { afterEach, describe, expect, it, vi } from 'vitest'

type AppShellController = {
  handleAppDataRequest: (request: Request) => Promise<Response>
  handleNavigationRequest: (request: Request) => Promise<Response>
  precacheAppShell: () => Promise<void>
  repairAppShellCache: () => Promise<void>
}

type TestServiceWorkerScope = {
  __PASTORE_SW__: {
    shared: Record<string, unknown>
    createAppShell?: (manifest: unknown) => AppShellController
  }
  location: {
    origin: string
  }
}

class MemoryCache {
  private readonly items = new Map<string, Response>()

  async put(request: RequestInfo | URL, response: Response) {
    this.items.set(getRequestUrl(request), response.clone())
  }

  async match(request: RequestInfo | URL) {
    return this.items.get(getRequestUrl(request))?.clone()
  }
}

function getRequestUrl(request: RequestInfo | URL) {
  return request instanceof Request ? request.url : request.toString()
}

function createAppShell(fetchMock: ReturnType<typeof vi.fn>, manifestOverride?: unknown) {
  const source = readFileSync(resolve(process.cwd(), 'public/sw/app-shell.js'), 'utf8')
  const cache = new MemoryCache()
  const swScope: TestServiceWorkerScope = {
    __PASTORE_SW__: {
      shared: {
        APP_SHELL_PREFIX: 'test-app-shell',
        OFFLINE_URL: '/offline.html',
        DEFAULT_PRECACHE_MANIFEST: {
          version: 'test',
          routes: [],
          urls: ['/offline.html'],
        },
        CACHEABLE_PUBLIC_ASSET_PATTERN: /\.(?:css|js)$/i,
        createCacheKey(pathOrUrl: string) {
          return new Request(new URL(pathOrUrl, swScope.location.origin).toString())
        },
        normalizePathname(pathname: string) {
          return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
        },
        safeDecodeURIComponent(value: string) {
          return value
        },
      },
    },
    location: {
      origin: 'https://app.test',
    },
  }
  const cacheStorage = {
    open: vi.fn(async () => cache),
  }

  vm.runInNewContext(
    source,
    {
      self: swScope,
      caches: cacheStorage,
      Request,
      Response,
      URL,
      fetch: fetchMock,
      setTimeout,
      clearTimeout,
    },
    { filename: 'public/sw/app-shell.js' }
  )

  const controller = swScope.__PASTORE_SW__.createAppShell?.(
    manifestOverride ?? {
      version: 'test',
      routes: [{ path: '/sessions', dataRoute: '/sessions.rsc' }],
      urls: ['/offline.html', '/sessions'],
    }
  )
  if (!controller) {
    throw new Error('Service-worker app shell controller was not registered.')
  }

  return {
    cache,
    controller,
  }
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('service-worker app shell', () => {
  it('serves a cached navigation when the network stalls past the field timeout', async () => {
    vi.useFakeTimers()

    const fetchMock = vi.fn(() => new Promise<Response>(() => undefined))
    const { cache, controller } = createAppShell(fetchMock)
    await cache.put(
      new Request('https://app.test/sessions'),
      new Response('<html>cached shell</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    )

    const responsePromise = controller.handleNavigationRequest(
      new Request('https://app.test/sessions')
    )
    await vi.advanceTimersByTimeAsync(3_000)

    const response = await responsePromise

    expect(fetchMock).toHaveBeenCalledOnce()
    await expect(response.text()).resolves.toBe('<html>cached shell</html>')
  })

  it('serves a cached data payload when the network stalls past the field timeout', async () => {
    vi.useFakeTimers()

    const fetchMock = vi.fn(() => new Promise<Response>(() => undefined))
    const { cache, controller } = createAppShell(fetchMock)
    await cache.put(
      new Request('https://app.test/sessions.rsc'),
      new Response('cached flight payload', {
        status: 200,
        headers: { 'Content-Type': 'text/x-component' },
      })
    )

    const responsePromise = controller.handleAppDataRequest(
      new Request('https://app.test/sessions?_rsc=abc')
    )
    await vi.advanceTimersByTimeAsync(3_000)

    const response = await responsePromise

    expect(fetchMock).toHaveBeenCalledOnce()
    await expect(response.text()).resolves.toBe('cached flight payload')
  })

  it('fails the precache when a core app-shell url cannot be fetched', async () => {
    const fetchMock = vi.fn(async (request: RequestInfo | URL) => {
      if (getRequestUrl(request).includes('/sessions')) {
        throw new TypeError('Failed to fetch')
      }

      return new Response('ok', { status: 200 })
    })
    const { controller } = createAppShell(fetchMock)

    await expect(controller.precacheAppShell()).rejects.toThrow(/precache incomplete/)
  })

  it('precaches app-shell urls and route data payloads', async () => {
    const fetchMock = vi.fn(async () => new Response('ok', { status: 200 }))
    const { cache, controller } = createAppShell(fetchMock)

    await controller.precacheAppShell()

    await expect(cache.match('https://app.test/offline.html')).resolves.toBeDefined()
    await expect(cache.match('https://app.test/sessions')).resolves.toBeDefined()
    await expect(cache.match('https://app.test/sessions.rsc')).resolves.toBeDefined()
  })

  it('precaches Next error documents served with their semantic error status', async () => {
    const fetchMock = vi.fn(async (request: RequestInfo | URL) => {
      const url = getRequestUrl(request)
      if (url.includes('/_not-found')) {
        return new Response('not found page', { status: 404 })
      }
      if (url.includes('/_global-error')) {
        return new Response('error page', { status: 500 })
      }

      return new Response('ok', { status: 200 })
    })
    const { cache, controller } = createAppShell(fetchMock, {
      version: 'test',
      routes: [{ path: '/sessions', dataRoute: '/sessions.rsc' }],
      urls: ['/offline.html', '/sessions', '/_not-found', '/_global-error'],
    })

    await expect(controller.precacheAppShell()).resolves.toBeUndefined()
    await expect(cache.match('https://app.test/_not-found')).resolves.toBeDefined()
    await expect(cache.match('https://app.test/_global-error')).resolves.toBeDefined()
  })

  it('repairs only the missing precache entries', async () => {
    const fetchMock = vi.fn<(request: RequestInfo | URL) => Promise<Response>>(
      async () => new Response('ok', { status: 200 })
    )
    const { cache, controller } = createAppShell(fetchMock)
    await cache.put(new Request('https://app.test/offline.html'), new Response('cached offline'))
    await cache.put(
      new Request('https://app.test/sessions.rsc'),
      new Response('cached flight payload')
    )

    await controller.repairAppShellCache()

    const fetchedUrls = fetchMock.mock.calls.map(([request]) => getRequestUrl(request))
    expect(fetchedUrls).toEqual(['https://app.test/sessions'])
    await expect(cache.match('https://app.test/sessions')).resolves.toBeDefined()
  })
})
