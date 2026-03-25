'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormButton, FormLabel, FormSelect } from '@/components/ui/form'
import { LoadingAlert } from '@/components/ui/alert'
import type { Herd } from '@/types/domain'

type ExportHerdCardProps = {
  exportableHerds: Herd[] | null
  activeHerdExportId: string
  isExportingHerd: boolean
  onSelectedHerdChange: (herdId: string) => void
  onExportSingleHerd: () => void | Promise<void>
}

export function ExportHerdCard({
  exportableHerds,
  activeHerdExportId,
  isExportingHerd,
  onSelectedHerdChange,
  onExportSingleHerd,
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

            <FormButton
              onClick={() => void onExportSingleHerd()}
              disabled={isExportingHerd}
              className="mt-4"
            >
              {isExportingHerd ? 'Erstellt Herden-JSON ...' : 'Herde als JSON herunterladen'}
            </FormButton>
          </>
        )}
      </CardContent>
    </Card>
  )
}
