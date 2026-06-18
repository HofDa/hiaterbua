import { Suspense } from 'react'
import { HerdEditSearchParamsPage } from '@/components/herds/herd-edit-search-params-page'

export default function HerdEditPage() {
  return (
    <Suspense
      fallback={
        <div className="app-panel p-5">
          Lade Daten …
        </div>
      }
    >
      <HerdEditSearchParamsPage />
    </Suspense>
  )
}
