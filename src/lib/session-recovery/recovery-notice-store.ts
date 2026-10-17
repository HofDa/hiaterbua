import { create } from 'zustand'

/**
 * The recovered session the user has not acknowledged yet. The full recovery
 * card shows only on Start and on the session's own screen; everywhere else
 * the recording bar reads this to show a tinted "Wiederhergestellt" state
 * instead of a ~900px card on top of every page.
 */
type RecoveryNoticeState = {
  pendingSessionKey: string | null
  setPendingSessionKey: (key: string | null) => void
}

export const useRecoveryNoticeStore = create<RecoveryNoticeState>((set) => ({
  pendingSessionKey: null,
  setPendingSessionKey: (key) => set({ pendingSessionKey: key }),
}))
