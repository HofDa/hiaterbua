'use client'

import toast from 'react-hot-toast'

/**
 * A short "saved + Rückgängig" notice for quick commits that have no screen
 * of their own (e.g. assigning a herd to a Pferch). Same promise as the
 * larger summary cards: say what was saved, allow a quick undo.
 */
export function showUndoToast(message: string, onUndo: () => void | Promise<void>) {
  toast(
    (t) => (
      <span className="flex items-center gap-3">
        <span className="text-sm font-semibold text-ink-strong">{message}</span>
        <button
          type="button"
          onClick={() => {
            toast.dismiss(t.id)
            void onUndo()
          }}
          className="min-h-11 shrink-0 rounded-full border-2 border-border-strong bg-surface-raised px-4 text-sm font-semibold text-ink-strong"
        >
          Rückgängig
        </button>
      </span>
    ),
    {
      duration: 10_000,
      style: {
        border: '2px solid var(--success-border)',
        background: 'var(--success-surface)',
        borderRadius: '1.1rem',
        maxWidth: '26rem',
      },
    }
  )
}
