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
      <div className="app-panel-sm p-5">
        Lade Daten ...
      </div>
    )
  }

  return <WorkPageContent sessions={workSessions} herds={herds} enclosures={enclosures} />
}
