'use client'

import { useRouter } from 'next/navigation'
import { useLiveQuery } from 'dexie-react-hooks'
import { HerdDetailPageContent } from '@/components/herds/herd-detail-page-content'
import { db } from '@/lib/db/dexie'
import { listActiveEnclosuresByName } from '@/lib/db/repositories/enclosures'

type HerdDetailRoutePageProps = {
  herdId: string | null
}

export function HerdDetailRoutePage({ herdId }: HerdDetailRoutePageProps) {
  const router = useRouter()
  const herd = useLiveQuery(() => (herdId ? db.herds.get(herdId) : undefined), [herdId])
  const animals = useLiveQuery(
    () => (herdId ? db.animals.where('herdId').equals(herdId).toArray() : []),
    [herdId]
  )
  const enclosures = useLiveQuery(() => listActiveEnclosuresByName(), [])
  const assignments = useLiveQuery(
    () =>
      herdId
        ? db.enclosureAssignments.where('herdId').equals(herdId).reverse().sortBy('updatedAt')
        : [],
    [herdId]
  )

  if (!herdId) {
    return (
      <div className="app-panel-sm p-5">
        Herde nicht angegeben.
      </div>
    )
  }

  if (
    herd === undefined ||
    animals === undefined ||
    enclosures === undefined ||
    assignments === undefined
  ) {
    return (
      <div className="app-panel-sm p-5">
        Lade Daten …
      </div>
    )
  }

  if (!herd) {
    return (
      <div className="app-panel-sm p-5">
        Herde nicht gefunden.
      </div>
    )
  }

  return (
    <HerdDetailPageContent
      herdId={herdId}
      herd={herd}
      animals={animals}
      enclosures={enclosures}
      assignments={assignments}
      onBack={() => router.back()}
      onDeleted={() => router.push('/herds')}
    />
  )
}
