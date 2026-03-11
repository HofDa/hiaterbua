'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { WorkPageContent } from '@/components/work/work-page-content'
import { db } from '@/lib/db/dexie'

export default function WorkPage() {
  const workSessions = useLiveQuery(() => db.workSessions.orderBy('updatedAt').reverse().toArray(), [])
  const herds = useLiveQuery(() => db.herds.orderBy('name').toArray(), [])
  const enclosures = useLiveQuery(() => db.enclosures.orderBy('name').toArray(), [])

  if (workSessions === undefined || herds === undefined || enclosures === undefined) {
    return (
      <div className="rounded-[1.75rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)]">
        Lade Daten ...
      </div>
    )
  }

  return <WorkPageContent sessions={workSessions} herds={herds} enclosures={enclosures} />
}
