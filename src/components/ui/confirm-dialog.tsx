'use client'

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { FormButton } from '@/components/ui/form'

export type ConfirmOptions = {
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

/**
 * Returns an async `confirm(options)` that opens the app's confirmation dialog and
 * resolves to whether the user confirmed — a styled, accessible, non-blocking
 * replacement for `window.confirm`.
 */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext)
  if (!confirm) {
    throw new Error('useConfirm must be used within <ConfirmDialogProvider>')
  }
  return confirm
}

type ConfirmState = {
  open: boolean
  options: ConfirmOptions
}

const closedState: ConfirmState = { open: false, options: { title: '' } }

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState>(closedState)
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null)

  const settle = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed)
    resolverRef.current = null
    setState((current) => ({ ...current, open: false }))
  }, [])

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      // Resolve any still-open prompt as cancelled before showing the new one.
      resolverRef.current?.(false)
      resolverRef.current = resolve
      setState({ open: true, options })
    })
  }, [])

  const { open, options } = state

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) settle(false) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px]" />
          <Dialog.Content className="app-panel fixed left-1/2 top-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 p-5 sm:p-6">
            <Dialog.Title className="text-lg font-semibold text-ink-strong">
              {options.title}
            </Dialog.Title>
            <Dialog.Description
              className={options.description ? 'mt-2 text-sm text-ink-muted' : 'sr-only'}
            >
              {options.description ?? options.title}
            </Dialog.Description>
            <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
              <FormButton type="button" variant="secondary" onClick={() => settle(false)}>
                {options.cancelLabel ?? 'Abbrechen'}
              </FormButton>
              <FormButton
                type="button"
                variant={options.destructive ? 'danger' : 'primary'}
                onClick={() => settle(true)}
              >
                {options.confirmLabel ?? 'Bestätigen'}
              </FormButton>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </ConfirmContext.Provider>
  )
}
