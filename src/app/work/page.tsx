'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { WorkPageContent } from '@/components/work/work-page-content'
import { listActiveEnclosuresByName } from '@/lib/db/repositories/enclosures'
import { listHerdsByName } from '@/lib/db/repositories/herds'
import { listWorkSessionsByRecent } from '@/lib/db/repositories/work-sessions'

export default function WorkPage() {
  const workSessions = useLiveQuery(() => listWorkSessionsByRecent(), [])
  const herds = useLiveQuery(() => listHerdsByName(), [])
  const enclosures = useLiveQuery(() => listActiveEnclosuresByName(), [])

  if (workSessions === undefined || herds === undefined || enclosures === undefined) {
    return (
      <div className="app-panel-sm p-5">
        Lade Daten ...
      </div>
    )
  }

  return <WorkPageContent sessions={workSessions} herds={herds} enclosures={enclosures} />
}
