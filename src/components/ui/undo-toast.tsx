'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import toast from 'react-hot-toast'
import { useNowTick } from '@/hooks/use-now-tick'

const UNDO_TOAST_MS = 10_000
const UNDO_TOAST_CLASS = 'pastore-undo-toast'

function UndoToastContent({
  message,
  startedAt,
  onUndo,
  onClose,
}: {
  message: string
  startedAt: number
  onUndo: () => void | Promise<void>
  onClose: () => void
}) {
  const nowMs = useNowTick(true)
  const remainingS = Math.max(0, Math.ceil((UNDO_TOAST_MS - (nowMs - startedAt)) / 1000))

  return (
    <span className="flex items-center gap-3">
      <span className="text-sm font-semibold text-ink-strong">{message}</span>
      <button
        type="button"
        onClick={() => {
          onClose()
          void onUndo()
        }}
        className="min-h-11 shrink-0 rounded-full border-2 border-border-strong bg-surface-raised px-4 text-sm font-semibold text-ink-strong"
      >
        Rückgängig <span className="tabular-nums text-ink-muted">({remainingS} s)</span>
      </button>
    </span>
  )
}

/**
 * The small "saved + Rückgängig" notice for quick commits without a screen of
 * their own (assigning a herd). Same promise as the summary cards: what was
 * saved, a counted-down undo. It belongs to the screen that made the change
 * and closes when the user moves on (see UndoToastRouteGuard).
 */
export function showUndoToast(message: string, onUndo: () => void | Promise<void>) {
  const startedAt = Date.now()
  toast(
    (t) => (
      <UndoToastContent
        message={message}
        startedAt={startedAt}
        onUndo={onUndo}
        onClose={() => toast.dismiss(t.id)}
      />
    ),
    {
      id: `undo-${startedAt}`,
      duration: UNDO_TOAST_MS,
      className: UNDO_TOAST_CLASS,
      // Top, under the header: at the bottom it covered the Pferch card it
      // refers to.
      position: 'top-center',
      style: {
        border: '2px solid var(--success-border)',
        background: 'var(--success-surface)',
        borderRadius: '1.1rem',
        maxWidth: '26rem',
      },
    }
  )
}

/**
 * Dismisses undo toasts on navigation, so a "Rückgängig" never floats over a
 * different task (e.g. the care answers) where one slip would undo the wrong
 * thing.
 */
export function UndoToastRouteGuard() {
  const pathname = usePathname()
  useEffect(() => {
    toast.dismiss()
  }, [pathname])
  return null
}
