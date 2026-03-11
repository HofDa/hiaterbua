export type ImageCaptureLike = {
  takePhoto: () => Promise<Blob>
}

export const AUTO_CAPTURE_STABLE_MS = 850

export function stopMediaStream(stream: MediaStream | null) {
  if (!stream) return

  stream.getTracks().forEach((track) => {
    track.stop()
  })
}

export function getImageCapture(track: MediaStreamTrack) {
  const maybeWindow = globalThis as typeof globalThis & {
    ImageCapture?: new (track: MediaStreamTrack) => ImageCaptureLike
  }

  if (!maybeWindow.ImageCapture) {
    return null
  }

  try {
    return new maybeWindow.ImageCapture(track)
  } catch {
    return null
  }
}

export async function drawBlobToCanvas(blob: Blob, canvas: HTMLCanvasElement) {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob)
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')

    if (!context) {
      bitmap.close()
      throw new Error('Photo canvas unavailable')
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return
  }

  const objectUrl = URL.createObjectURL(blob)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new window.Image()
      nextImage.onload = () => resolve(nextImage)
      nextImage.onerror = () => reject(new Error('Photo image unavailable'))
      nextImage.src = objectUrl
    })
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Photo canvas unavailable')
    }

    canvas.width = image.naturalWidth || image.width
    canvas.height = image.naturalHeight || image.height
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export function describeCameraError(error: unknown) {
  if (!(error instanceof DOMException)) {
    return 'Kamera konnte nicht gestartet werden.'
  }

  if (error.name === 'NotAllowedError') {
    return 'Kamerazugriff wurde blockiert. Bitte Berechtigung freigeben.'
  }

  if (error.name === 'NotFoundError') {
    return 'Keine Kamera gefunden.'
  }

  if (error.name === 'NotReadableError') {
    return 'Kamera ist bereits in Verwendung oder nicht lesbar.'
  }

  if (error.name === 'OverconstrainedError') {
    return 'Gewünschte Kameraeinstellung ist auf diesem Gerät nicht verfügbar.'
  }

  return 'Kamera konnte nicht gestartet werden.'
}
