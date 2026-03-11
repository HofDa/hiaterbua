'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useLiveQuery } from 'dexie-react-hooks'
import { HerdDetailPageContent } from '@/components/herds/herd-detail-page-content'
import { db } from '@/lib/db/dexie'

export default function HerdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const herd = useLiveQuery(() => db.herds.get(id), [id])
  const allAnimals = useLiveQuery(() => db.animals.toArray(), [])
  const animals = useLiveQuery(
    () => db.animals.where('herdId').equals(id).toArray(),
    [id]
  )
  const enclosures = useLiveQuery(() => db.enclosures.orderBy('name').toArray(), [])
  const assignments = useLiveQuery(
    () => db.enclosureAssignments.where('herdId').equals(id).reverse().sortBy('updatedAt'),
    [id]
  )

  if (herd === undefined || animals === undefined || enclosures === undefined || assignments === undefined) {
    return <div className="rounded-[1.75rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)]">Lade Daten …</div>
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
      herdId={id}
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
