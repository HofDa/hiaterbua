import { afterEach, describe, expect, it, vi } from 'vitest'
import { canShareFiles, shareOrDownloadBlob } from '@/lib/import-export/file-formats'

function makeBlob() {
  return new Blob(['{"hello":"welt"}'], { type: 'application/json' })
}

/**
 * Stubs the DOM pieces `downloadBlob` touches so the fallback path can be
 * observed (and asserted absent) in the Node test environment.
 */
function stubDownloadEnvironment() {
  const click = vi.fn()
  const link = { href: '', download: '', click }
  const createElement = vi.fn(() => link)
  const createObjectURL = vi.fn(() => 'blob:test-url')
  const revokeObjectURL = vi.fn()

  vi.stubGlobal('document', { createElement })
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

  return { click, link, createObjectURL, revokeObjectURL }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('shareOrDownloadBlob', () => {
  it('shares the file via the native share sheet when file sharing is supported', async () => {
    const download = stubDownloadEnvironment()
    const canShare = vi.fn(() => true)
    const share = vi.fn<(data: ShareData) => Promise<void>>(async () => {})
    vi.stubGlobal('navigator', { canShare, share })

    const outcome = await shareOrDownloadBlob(makeBlob(), 'export.json', 'ZIP-Export')

    expect(outcome).toBe('shared')
    expect(share).toHaveBeenCalledTimes(1)

    const shareData = share.mock.calls[0]![0]
    expect(shareData.title).toBe('ZIP-Export')
    expect(shareData.files).toHaveLength(1)

    const sharedFile = shareData.files![0]!
    expect(sharedFile).toBeInstanceOf(File)
    expect(sharedFile.name).toBe('export.json')
    expect(sharedFile.type).toBe('application/json')

    expect(canShare).toHaveBeenCalledWith({ files: [sharedFile] })
    expect(download.click).not.toHaveBeenCalled()
    expect(download.createObjectURL).not.toHaveBeenCalled()
  })

  it('uses the filename as share title when no title is given', async () => {
    stubDownloadEnvironment()
    const share = vi.fn<(data: ShareData) => Promise<void>>(async () => {})
    vi.stubGlobal('navigator', { canShare: () => true, share })

    await shareOrDownloadBlob(makeBlob(), 'herde.json')

    expect(share.mock.calls[0]![0].title).toBe('herde.json')
  })

  it('returns silently on a user-cancelled share without fallback download', async () => {
    const download = stubDownloadEnvironment()
    const share = vi.fn(async () => {
      throw new DOMException('Der Nutzer hat abgebrochen.', 'AbortError')
    })
    vi.stubGlobal('navigator', { canShare: () => true, share })

    const outcome = await shareOrDownloadBlob(makeBlob(), 'export.json')

    expect(outcome).toBe('cancelled')
    expect(download.click).not.toHaveBeenCalled()
    expect(download.createObjectURL).not.toHaveBeenCalled()
  })

  it('falls back to download when the browser has no Web Share API', async () => {
    const download = stubDownloadEnvironment()
    vi.stubGlobal('navigator', {})

    const outcome = await shareOrDownloadBlob(makeBlob(), 'export.json')

    expect(outcome).toBe('downloaded')
    expect(download.createObjectURL).toHaveBeenCalledTimes(1)
    expect(download.link.download).toBe('export.json')
    expect(download.click).toHaveBeenCalledTimes(1)
    expect(download.revokeObjectURL).toHaveBeenCalledWith('blob:test-url')
  })

  it('falls back to download when canShare rejects the file', async () => {
    const download = stubDownloadEnvironment()
    const share = vi.fn(async () => {})
    vi.stubGlobal('navigator', { canShare: () => false, share })

    const outcome = await shareOrDownloadBlob(makeBlob(), 'export.json')

    expect(outcome).toBe('downloaded')
    expect(share).not.toHaveBeenCalled()
    expect(download.click).toHaveBeenCalledTimes(1)
  })

  it('falls back to download when share fails for another reason', async () => {
    const download = stubDownloadEnvironment()
    const share = vi.fn(async () => {
      throw new Error('Freigabe fehlgeschlagen')
    })
    vi.stubGlobal('navigator', { canShare: () => true, share })

    const outcome = await shareOrDownloadBlob(makeBlob(), 'export.json')

    expect(outcome).toBe('downloaded')
    expect(share).toHaveBeenCalledTimes(1)
    expect(download.click).toHaveBeenCalledTimes(1)
    expect(download.link.download).toBe('export.json')
  })
})

describe('canShareFiles', () => {
  it('is false when navigator has no canShare', () => {
    vi.stubGlobal('navigator', {})

    expect(canShareFiles()).toBe(false)
  })

  it('is true when the browser can share files', () => {
    const canShare = vi.fn((data: { files?: File[] }) => Boolean(data.files?.length))
    vi.stubGlobal('navigator', { canShare })

    expect(canShareFiles()).toBe(true)
    expect(canShare).toHaveBeenCalledTimes(1)
    expect(canShare.mock.calls[0]![0].files![0]).toBeInstanceOf(File)
  })

  it('is false when canShare rejects files', () => {
    vi.stubGlobal('navigator', { canShare: () => false })

    expect(canShareFiles()).toBe(false)
  })

  it('is false when canShare throws', () => {
    vi.stubGlobal('navigator', {
      canShare: () => {
        throw new TypeError('files not supported')
      },
    })

    expect(canShareFiles()).toBe(false)
  })
})
