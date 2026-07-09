export const DEBUG_FIELD_DIAGNOSTICS_STORAGE_KEY = 'debugFieldDiagnostics'
export const DEBUG_FIELD_DIAGNOSTICS_CHANGED_EVENT =
  'pastore:debug-field-diagnostics-changed'

export type UiBlockerDetails = {
  tagName: string
  id: string
  className: string
  role: string | null
  ariaModal: string | null
  zIndex: string
  pointerEvents: string
  boundingClientRect: {
    x: number
    y: number
    width: number
    height: number
    top: number
    right: number
    bottom: number
    left: number
  }
  textPreview: string
}

export type UiBlockerCandidate = {
  tagName: string
  open: boolean
  role: string | null
  ariaModal: string | null
  className: string
  position: string
  zIndex: string
  pointerEvents: string
  display: string
  visibility: string
  opacity: string
  rect: {
    width: number
    height: number
  }
  viewport: {
    width: number
    height: number
  }
  interceptsPointer: boolean
}

const HIGH_Z_INDEX = 40
const LARGE_VIEWPORT_COVERAGE = 0.45
const KNOWN_BLOCKER_CLASS_PATTERN = /(?:modal|dialog|overlay|backdrop|scrim|portal)/i

export function isDebugFieldDiagnosticsEnabledFromState(input: {
  nodeEnv: string | undefined
  search: string
  storageValue: string | null
}) {
  if (input.nodeEnv === 'development') return true
  if (new URLSearchParams(input.search).get('debugField') === '1') return true
  return input.storageValue === 'true'
}

export function isDebugFieldDiagnosticsEnabled() {
  let storageValue: string | null = null
  try {
    storageValue =
      typeof window === 'undefined'
        ? null
        : window.localStorage.getItem(DEBUG_FIELD_DIAGNOSTICS_STORAGE_KEY)
  } catch {
    storageValue = null
  }

  return isDebugFieldDiagnosticsEnabledFromState({
    nodeEnv: process.env.NODE_ENV,
    search: typeof window === 'undefined' ? '' : window.location.search,
    storageValue,
  })
}

export function setDebugFieldDiagnosticsEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DEBUG_FIELD_DIAGNOSTICS_STORAGE_KEY, enabled ? 'true' : 'false')
    window.dispatchEvent(new Event(DEBUG_FIELD_DIAGNOSTICS_CHANGED_EVENT))
  } catch {
    // Debug-only setting; ignore unavailable storage.
  }
}

export function isLikelyUiBlockerCandidate(candidate: UiBlockerCandidate) {
  if (
    candidate.display === 'none' ||
    candidate.visibility === 'hidden' ||
    candidate.opacity === '0' ||
    candidate.pointerEvents === 'none'
  ) {
    return false
  }

  const viewportArea = candidate.viewport.width * candidate.viewport.height
  const candidateArea = candidate.rect.width * candidate.rect.height
  const coversLargeArea =
    viewportArea > 0 && candidateArea / viewportArea >= LARGE_VIEWPORT_COVERAGE
  const zIndexNumber = Number.parseInt(candidate.zIndex, 10)
  const hasHighZIndex = Number.isFinite(zIndexNumber) && zIndexNumber >= HIGH_Z_INDEX
  const hasModalSemantics =
    (candidate.tagName === 'DIALOG' && candidate.open) ||
    candidate.role === 'dialog' ||
    candidate.ariaModal === 'true'
  const hasKnownBlockerClass = KNOWN_BLOCKER_CLASS_PATTERN.test(candidate.className)
  const isOverlayPosition =
    candidate.position === 'fixed' || candidate.position === 'absolute'

  if (hasModalSemantics) return true

  return (
    isOverlayPosition &&
    candidate.interceptsPointer &&
    (coversLargeArea || hasKnownBlockerClass) &&
    (hasHighZIndex || hasKnownBlockerClass)
  )
}

function toRect(rect: DOMRect): UiBlockerDetails['boundingClientRect'] {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    top: Math.round(rect.top),
    right: Math.round(rect.right),
    bottom: Math.round(rect.bottom),
    left: Math.round(rect.left),
  }
}

function getClassName(element: Element) {
  return typeof element.className === 'string' ? element.className : ''
}

function getTextPreview(element: Element) {
  return (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 160)
}

function isElementAtPointWithinCandidate(element: HTMLElement, x: number, y: number) {
  const topElement = document.elementFromPoint(x, y)
  return Boolean(topElement && (topElement === element || element.contains(topElement)))
}

function interceptsPointer(element: HTMLElement, rect: DOMRect) {
  const samplePoints = [
    [window.innerWidth / 2, window.innerHeight / 2],
    [rect.left + rect.width / 2, rect.top + rect.height / 2],
    [Math.max(rect.left + 8, 0), Math.max(rect.top + 8, 0)],
  ]

  return samplePoints.some(([x, y]) =>
    isElementAtPointWithinCandidate(
      element,
      Math.min(Math.max(x, 0), window.innerWidth - 1),
      Math.min(Math.max(y, 0), window.innerHeight - 1)
    )
  )
}

export function findPotentialUiBlockers(): UiBlockerDetails[] {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return []
  }

  const viewport = {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight,
  }
  const elements = Array.from(document.body.querySelectorAll<HTMLElement>('*'))

  return elements.flatMap((element) => {
    const style = window.getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    const candidate: UiBlockerCandidate = {
      tagName: element.tagName,
      open:
        typeof HTMLDialogElement !== 'undefined' && element instanceof HTMLDialogElement
          ? element.open
          : element.hasAttribute('open'),
      role: element.getAttribute('role'),
      ariaModal: element.getAttribute('aria-modal'),
      className: getClassName(element),
      position: style.position,
      zIndex: style.zIndex,
      pointerEvents: style.pointerEvents,
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      rect,
      viewport,
      interceptsPointer: interceptsPointer(element, rect),
    }

    if (!isLikelyUiBlockerCandidate(candidate)) {
      return []
    }

    return [
      {
        tagName: element.tagName,
        id: element.id,
        className: getClassName(element),
        role: element.getAttribute('role'),
        ariaModal: element.getAttribute('aria-modal'),
        zIndex: style.zIndex,
        pointerEvents: style.pointerEvents,
        boundingClientRect: toRect(rect),
        textPreview: getTextPreview(element),
      },
    ]
  })
}

export function getUiBlockerSignature(details: UiBlockerDetails) {
  return [
    details.tagName,
    details.id,
    details.className,
    details.role,
    details.ariaModal,
    details.zIndex,
    details.boundingClientRect.width,
    details.boundingClientRect.height,
    details.textPreview,
  ].join('|')
}
