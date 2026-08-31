import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The module keeps its pending-files queue and init guard in module scope, so
// every test gets a fresh copy via resetModules + dynamic import.
async function importLaunchFilesModule() {
  return import('@/lib/import-export/launch-files')
}

function createFile(name: string) {
  return new File(['{}'], name, { type: 'application/json' })
}

// Minimal stand-in for the browser window: the module only needs the
// EventTarget surface (add/removeEventListener, dispatchEvent) plus an
// optional `launchQueue` property.
function createWindowStub(launchQueue?: unknown) {
  const target = new EventTarget() as EventTarget & { launchQueue?: unknown }
  if (launchQueue !== undefined) {
    target.launchQueue = launchQueue
  }
  return target
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('launch files queue', () => {
  it('delivers files that were enqueued before anyone subscribed', async () => {
    vi.stubGlobal('window', createWindowStub())
    const { enqueueLaunchFiles, subscribeToLaunchFiles, consumePendingLaunchFiles } =
      await importLaunchFilesModule()

    const file = createFile('app-data.json')
    enqueueLaunchFiles([file])

    // Subscribe only after the enqueue — the launch usually fires before the
    // /export page mounts. The listener must not be required for delivery.
    const listener = vi.fn()
    const unsubscribe = subscribeToLaunchFiles(listener)

    expect(listener).not.toHaveBeenCalled()
    expect(consumePendingLaunchFiles()).toEqual([file])

    unsubscribe()
  })

  it('notifies subscribers when files are enqueued after subscribing', async () => {
    vi.stubGlobal('window', createWindowStub())
    const { enqueueLaunchFiles, subscribeToLaunchFiles, consumePendingLaunchFiles } =
      await importLaunchFilesModule()

    const listener = vi.fn()
    const unsubscribe = subscribeToLaunchFiles(listener)

    const file = createFile('backup.zip')
    enqueueLaunchFiles([file])

    expect(listener).toHaveBeenCalledTimes(1)
    expect(consumePendingLaunchFiles()).toEqual([file])

    unsubscribe()
    enqueueLaunchFiles([createFile('after-unsubscribe.json')])
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('hands out pending files exactly once', async () => {
    vi.stubGlobal('window', createWindowStub())
    const { enqueueLaunchFiles, consumePendingLaunchFiles } = await importLaunchFilesModule()

    const first = createFile('first.json')
    const second = createFile('second.geojson')
    enqueueLaunchFiles([first])
    enqueueLaunchFiles([second])

    expect(consumePendingLaunchFiles()).toEqual([first, second])
    expect(consumePendingLaunchFiles()).toEqual([])
  })

  it('is a silent no-op without window (SSR)', async () => {
    const { initLaunchQueueFileHandling, subscribeToLaunchFiles, enqueueLaunchFiles } =
      await importLaunchFilesModule()

    expect(() => initLaunchQueueFileHandling()).not.toThrow()
    expect(() => enqueueLaunchFiles([createFile('ssr.json')])).not.toThrow()
    expect(() => subscribeToLaunchFiles(() => {})()).not.toThrow()
  })

  it('is a silent no-op when window.launchQueue is unavailable', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('window', createWindowStub())
    const { initLaunchQueueFileHandling, consumePendingLaunchFiles } =
      await importLaunchFilesModule()

    expect(() => initLaunchQueueFileHandling()).not.toThrow()
    expect(consumePendingLaunchFiles()).toEqual([])
    expect(errorSpy).not.toHaveBeenCalled()

    errorSpy.mockRestore()
  })

  it('registers a consumer that converts handles to files and enqueues them', async () => {
    let consumer: ((launchParams: { files?: unknown[] }) => void) | null = null
    const launchQueue = {
      setConsumer: vi.fn((nextConsumer: (launchParams: { files?: unknown[] }) => void) => {
        consumer = nextConsumer
      }),
    }
    vi.stubGlobal('window', createWindowStub(launchQueue))
    const { initLaunchQueueFileHandling, consumePendingLaunchFiles, subscribeToLaunchFiles } =
      await importLaunchFilesModule()

    initLaunchQueueFileHandling()
    // Registering twice must not re-set the consumer.
    initLaunchQueueFileHandling()
    expect(launchQueue.setConsumer).toHaveBeenCalledTimes(1)
    expect(consumer).not.toBeNull()

    const file = createFile('app-data.json')
    const handle = { getFile: () => Promise.resolve(file) }

    const listener = vi.fn()
    subscribeToLaunchFiles(listener)

    consumer!({ files: [handle] })
    await vi.waitFor(() => expect(listener).toHaveBeenCalled())

    expect(consumePendingLaunchFiles()).toEqual([file])

    // Launches without files (plain app launch) must not notify.
    consumer!({ files: [] })
    consumer!({})
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(listener).toHaveBeenCalledTimes(1)
    expect(consumePendingLaunchFiles()).toEqual([])
  })
})
