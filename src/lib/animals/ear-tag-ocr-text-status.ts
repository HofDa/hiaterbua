export function describeOcrStatus(status: string) {
  switch (status) {
    case 'loading tesseract core':
      return 'OCR-Kern wird geladen'
    case 'initializing tesseract':
      return 'OCR wird initialisiert'
    case 'loading language traineddata':
      return 'Sprachdaten werden geladen'
    case 'initializing api':
      return 'OCR wird vorbereitet'
    case 'recognizing text':
      return 'Ohrmarke wird gelesen'
    default:
      return 'Ohrmarke wird vorbereitet'
  }
}

export function describeOcrError(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('failed to fetch')
    ) {
      return 'OCR-Sprachdaten konnten nicht geladen werden. Beim ersten Scan ist kurz Netz nötig.'
    }

    if (message.includes('worker')) {
      return 'OCR-Worker konnte nicht gestartet werden.'
    }
  }

  return 'Ohrmarke konnte aus dem Foto nicht gelesen werden.'
}
