'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { FormButton } from '@/components/ui/form'
import { Alert, LoadingAlert } from '@/components/ui/alert'

type ExportWorkCardProps = {
  workSessionCount: number | null
  workEventCount: number | null
  isExportingWorkSessions: boolean
  canShare: boolean
  onExportWorkSessions: () => void | Promise<void>
  onShareWorkSessions: () => void | Promise<void>
}

export function ExportWorkCard({
  workSessionCount,
  workEventCount,
  isExportingWorkSessions,
  canShare,
  onExportWorkSessions,
  onShareWorkSessions,
}: ExportWorkCardProps) {
  const isLoading = workSessionCount === null || workEventCount === null
  const hasWorkSessions = (workSessionCount ?? 0) > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Alle Arbeitseinsätze exportieren</CardTitle>
            <p className="mt-2 text-sm font-medium text-ink-soft">
              Exportiert alle Arbeitseinsätze und Arbeitsereignisse als eigene JSON-Datei inklusive
              referenzierter Herden und Pferche.
            </p>
          </div>
          {!isLoading ? (
            <div className="rounded-full border border-border bg-accent px-3 py-1 text-xs font-semibold text-ink-strong">
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
                <div className="font-medium text-ink-muted">Arbeitseinsätze</div>
                <div className="mt-1 text-lg font-semibold text-ink-strong">
                  {workSessionCount}
                </div>
              </Card>
              <Card className="px-4 py-3">
                <div className="font-medium text-ink-muted">Arbeitsereignisse</div>
                <div className="mt-1 text-lg font-semibold text-ink-strong">{workEventCount}</div>
              </Card>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <FormButton
                type="button"
                onClick={() => void onExportWorkSessions()}
                disabled={isExportingWorkSessions}
                variant="primary"
              >
                {isExportingWorkSessions
                  ? 'Erstellt Arbeits-JSON ...'
                  : 'Arbeitseinsätze als JSON herunterladen'}
              </FormButton>
              {canShare ? (
                <FormButton
                  type="button"
                  onClick={() => void onShareWorkSessions()}
                  disabled={isExportingWorkSessions}
                  variant="secondary"
                >
                  Teilen
                </FormButton>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
