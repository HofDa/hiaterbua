'use client'

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
    <section className="rounded-3xl border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Alle Arbeitseinsätze exportieren</h2>
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

      {isLoading ? (
        <div className="mt-4 rounded-2xl border border-[#ccb98a] bg-[#efe4c8] px-4 py-3 text-sm font-semibold text-neutral-900">
          Lade Arbeitseinsätze ...
        </div>
      ) : !hasWorkSessions ? (
        <div className="mt-4 rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-neutral-800">
          Keine Arbeitseinsätze vorhanden.
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm text-neutral-900">
              <div className="font-medium text-neutral-700">Arbeitseinsätze</div>
              <div className="mt-1 text-lg font-semibold text-neutral-950">
                {workSessionCount}
              </div>
            </div>
            <div className="rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm text-neutral-900">
              <div className="font-medium text-neutral-700">Arbeitsereignisse</div>
              <div className="mt-1 text-lg font-semibold text-neutral-950">{workEventCount}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void onExportWorkSessions()}
            disabled={isExportingWorkSessions}
            className="mt-4 rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-4 py-4 font-semibold text-[#17130f] disabled:opacity-50"
          >
            {isExportingWorkSessions
              ? 'Erstellt Arbeits-JSON ...'
              : 'Arbeitseinsätze als JSON herunterladen'}
          </button>
        </>
      )}
    </section>
  )
}
