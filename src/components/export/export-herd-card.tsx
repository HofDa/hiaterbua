'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormButton, FormLabel, FormSelect } from '@/components/ui/form'
import { LoadingAlert } from '@/components/ui/alert'
import type { Herd } from '@/types/domain'

type ExportHerdCardProps = {
  exportableHerds: Herd[] | null
  activeHerdExportId: string
  isExportingHerd: boolean
  canShare: boolean
  onSelectedHerdChange: (herdId: string) => void
  onExportSingleHerd: () => void | Promise<void>
  onShareSingleHerd: () => void | Promise<void>
}

export function ExportHerdCard({
  exportableHerds,
  activeHerdExportId,
  isExportingHerd,
  canShare,
  onSelectedHerdChange,
  onExportSingleHerd,
  onShareSingleHerd,
}: ExportHerdCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Einzelne Herde exportieren</CardTitle>
        <CardDescription>
          Exportiert genau eine Herde als eigene JSON-Datei mit Stammdaten, Tieren, Belegungen,
          zugehörigen Pferchen, Weidegängen und Arbeitseinsätzen.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {exportableHerds === null ? (
          <LoadingAlert>Lade Herden ...</LoadingAlert>
        ) : exportableHerds.length === 0 ? (
          <LoadingAlert>Keine Herde vorhanden.</LoadingAlert>
        ) : (
          <>
            <FormLabel>
              Herde wählen
              <FormSelect
                value={activeHerdExportId}
                onChange={(event) => onSelectedHerdChange(event.target.value)}
                className="mt-2"
              >
                {exportableHerds.map((herd) => (
                  <option key={herd.id} value={herd.id}>
                    {herd.name}
                  </option>
                ))}
              </FormSelect>
            </FormLabel>

            <div className="mt-4 flex flex-wrap gap-2">
              <FormButton onClick={() => void onExportSingleHerd()} disabled={isExportingHerd}>
                {isExportingHerd ? 'Erstellt Herden-JSON ...' : 'Herde als JSON herunterladen'}
              </FormButton>
              {canShare ? (
                <FormButton
                  onClick={() => void onShareSingleHerd()}
                  disabled={isExportingHerd}
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
