'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { FormButton } from '@/components/ui/form'
import { Alert, LoadingAlert } from '@/components/ui/alert'

type ExportWorkCardProps = {
  workSessionCount: number | null
  workEventCount: number | null
  isExportingWorkSessions: boolean
  onExportWorkSessions: () => void | Promise<void>
}

export function ExportWorkCard({
  workSessionCount,
  workEventCount,
  isExportingWorkSessions,
  onExportWorkSessions,
}: ExportWorkCardProps) {
  const isLoading = workSessionCount === null || workEventCount === null
  const hasWorkSessions = (workSessionCount ?? 0) > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Alle Arbeitseinsätze exportieren</CardTitle>
            <p className="mt-2 text-sm font-medium text-neutral-800">
              Exportiert alle Arbeitseinsätze und Arbeitsereignisse als eigene JSON-Datei inklusive
              referenzierter Herden und Pferche.
            </p>
          </div>
          {!isLoading ? (
            <div className="rounded-full border border-[#ccb98a] bg-[#efe4c8] px-3 py-1 text-xs font-semibold text-neutral-950">
              {(workSessionCount ?? 0)} Einsätze
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent>

        {isLoading ? (
          <LoadingAlert>Lade Arbeitseinsätze ...</LoadingAlert>
        ) : !hasWorkSessions ? (
          <Alert variant="info">Keine Arbeitseinsätze vorhanden.</Alert>
        ) : (
          <>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Card className="px-4 py-3">
                <div className="font-medium text-neutral-700">Arbeitseinsätze</div>
                <div className="mt-1 text-lg font-semibold text-neutral-950">
                  {workSessionCount}
                </div>
              </Card>
              <Card className="px-4 py-3">
                <div className="font-medium text-neutral-700">Arbeitsereignisse</div>
                <div className="mt-1 text-lg font-semibold text-neutral-950">{workEventCount}</div>
              </Card>
            </div>

            <FormButton
              type="button"
              onClick={() => void onExportWorkSessions()}
              disabled={isExportingWorkSessions}
              variant="primary"
              className="mt-4"
            >
              {isExportingWorkSessions
                ? 'Erstellt Arbeits-JSON ...'
                : 'Arbeitseinsätze als JSON herunterladen'}
            </FormButton>
          </>
        )}
      </CardContent>
    </Card>
  )
}
