import { describe, expect, it } from 'vitest'
import {
  isDebugFieldDiagnosticsEnabledFromState,
  isLikelyUiBlockerCandidate,
  type UiBlockerCandidate,
} from '@/lib/diagnostics/ui-blocker-detector'

function candidate(overrides: Partial<UiBlockerCandidate> = {}): UiBlockerCandidate {
  return {
    tagName: 'DIV',
    open: false,
    role: null,
    ariaModal: null,
    className: '',
    position: 'static',
    zIndex: 'auto',
    pointerEvents: 'auto',
    display: 'block',
    visibility: 'visible',
    opacity: '1',
    rect: { width: 100, height: 100 },
    viewport: { width: 1000, height: 1000 },
    interceptsPointer: false,
    ...overrides,
  }
}

describe('isDebugFieldDiagnosticsEnabledFromState', () => {
  it('enables diagnostics in development, with URL flag, or stored setting', () => {
    expect(
      isDebugFieldDiagnosticsEnabledFromState({
        nodeEnv: 'development',
        search: '',
        storageValue: null,
      })
    ).toBe(true)
    expect(
      isDebugFieldDiagnosticsEnabledFromState({
        nodeEnv: 'production',
        search: '?debugField=1',
        storageValue: null,
      })
    ).toBe(true)
    expect(
      isDebugFieldDiagnosticsEnabledFromState({
        nodeEnv: 'production',
        search: '',
        storageValue: 'true',
      })
    ).toBe(true)
  })

  it('stays disabled by default in production', () => {
    expect(
      isDebugFieldDiagnosticsEnabledFromState({
        nodeEnv: 'production',
        search: '',
        storageValue: null,
      })
    ).toBe(false)
  })
})

describe('isLikelyUiBlockerCandidate', () => {
  it('detects open dialogs and aria-modal elements', () => {
    expect(isLikelyUiBlockerCandidate(candidate({ tagName: 'DIALOG', open: true }))).toBe(
      true
    )
    expect(isLikelyUiBlockerCandidate(candidate({ ariaModal: 'true' }))).toBe(true)
  })

  it('detects large high-z pointer-intercepting overlays', () => {
    expect(
      isLikelyUiBlockerCandidate(
        candidate({
          position: 'fixed',
          zIndex: '50',
          rect: { width: 1000, height: 800 },
          interceptsPointer: true,
        })
      )
    ).toBe(true)
  })

  it('ignores pointer-transparent or small chrome elements', () => {
    expect(
      isLikelyUiBlockerCandidate(
        candidate({
          position: 'fixed',
          zIndex: '50',
          pointerEvents: 'none',
          rect: { width: 1000, height: 800 },
          interceptsPointer: true,
        })
      )
    ).toBe(false)
    expect(
      isLikelyUiBlockerCandidate(
        candidate({
          position: 'fixed',
          zIndex: '50',
          rect: { width: 1000, height: 80 },
          interceptsPointer: true,
        })
      )
    ).toBe(false)
  })
})

