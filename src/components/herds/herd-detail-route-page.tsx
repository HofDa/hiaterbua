'use client'

import { useRouter } from 'next/navigation'
import { useLiveQuery } from 'dexie-react-hooks'
import { HerdDetailPageContent } from '@/components/herds/herd-detail-page-content'
import { db } from '@/lib/db/dexie'

type HerdDetailRoutePageProps = {
  herdId: string | null
}

export function HerdDetailRoutePage({ herdId }: HerdDetailRoutePageProps) {
  const router = useRouter()
  const herd = useLiveQuery(() => (herdId ? db.herds.get(herdId) : undefined), [herdId])
  const allAnimals = useLiveQuery(() => db.animals.toArray(), [])
  const animals = useLiveQuery(
    () => (herdId ? db.animals.where('herdId').equals(herdId).toArray() : []),
    [herdId]
  )
  const enclosures = useLiveQuery(() => db.enclosures.orderBy('name').toArray(), [])
  const assignments = useLiveQuery(
    () =>
      herdId
        ? db.enclosureAssignments.where('herdId').equals(herdId).reverse().sortBy('updatedAt')
        : [],
    [herdId]
  )

  if (!herdId) {
    return (
      <div className="rounded-[1.75rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)]">
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
      <div className="rounded-[1.75rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)]">
        Lade Daten …
      </div>
    )
  }

  if (!herd) {
    return (
      <div className="rounded-[1.75rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)]">
        Herde nicht gefunden.
      </div>
    )
  }

  return (
    <HerdDetailPageContent
      herdId={herdId}
      herd={herd}
      allAnimals={allAnimals ?? []}
      animals={animals}
      enclosures={enclosures}
      assignments={assignments}
      onBack={() => router.back()}
      onDeleted={() => router.push('/herds')}
    />
  )
}
