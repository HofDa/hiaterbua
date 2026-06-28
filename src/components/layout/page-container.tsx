import type { PropsWithChildren } from 'react'

export function PageContainer({ children }: PropsWithChildren) {
  return (
    <main className="mx-auto min-h-[calc(100dvh-7rem)] max-w-6xl px-3 pb-[calc(var(--app-bottom-nav-height)+var(--app-recording-bar-height)+env(safe-area-inset-bottom)+1rem)] pt-3 md:min-h-[calc(100dvh-150px)] md:px-4 md:pb-[calc(var(--app-bottom-nav-height)+var(--app-recording-bar-height)+env(safe-area-inset-bottom)+2rem)] md:pt-8 xl:max-w-[88rem]">
      {children}
    </main>
  )
}
