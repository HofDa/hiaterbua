import { Suspense } from 'react'
import { HerdDetailSearchParamsPage } from '@/components/herds/herd-detail-search-params-page'

export default function HerdPage() {
  return (
    <Suspense
      fallback={
        <div className="app-panel-sm p-5">
          Lade Daten …
        </div>
      }
    >
      <HerdDetailSearchParamsPage />
    </Suspense>
  )
}
