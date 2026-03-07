import type { PropsWithChildren } from 'react'

export function PageContainer({ children }: PropsWithChildren) {
  return (
    <main className="mx-auto min-h-[calc(100dvh-150px)] max-w-6xl px-4 py-5 md:py-8">
      {children}
    </main>
  )
}
