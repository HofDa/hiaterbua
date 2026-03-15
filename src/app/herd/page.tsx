import { Suspense } from 'react'
import { HerdDetailSearchParamsPage } from '@/components/herds/herd-detail-search-params-page'

export default function HerdPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-[1.75rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)]">
          Lade Daten …
        </div>
      }
    >
      <HerdDetailSearchParamsPage />
    </Suspense>
  )
}
