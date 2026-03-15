import { Suspense } from 'react'
import { HerdEditSearchParamsPage } from '@/components/herds/herd-edit-search-params-page'

export default function HerdEditPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
          Lade Daten …
        </div>
      }
    >
      <HerdEditSearchParamsPage />
    </Suspense>
  )
}
