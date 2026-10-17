import { useEffect } from 'react'
import { create } from 'zustand'

/**
 * Lets a detail screen name itself in the mobile top bar (e.g. the herd's
 * name instead of the section "Herden").
 */
const usePageTitleStore = create<{ title: string | null; setTitle: (title: string | null) => void }>(
  (set) => ({ title: null, setTitle: (title) => set({ title }) })
)

export function usePageTitleOverride() {
  return usePageTitleStore((state) => state.title)
}

/** Sets the top-bar title while the calling screen is mounted. */
export function usePageTitle(title: string | null | undefined) {
  const setTitle = usePageTitleStore((state) => state.setTitle)
  useEffect(() => {
    setTitle(title ?? null)
    return () => setTitle(null)
  }, [setTitle, title])
}
