'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormButton } from '@/components/ui/form'

type ExportZipCardProps = {
  isExporting: boolean
  onExportZip: () => void | Promise<void>
}

export function ExportZipCard({ isExporting, onExportZip }: ExportZipCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ZIP-Export</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mt-2 text-sm font-medium text-neutral-800">
          Enthält Pferche, Untersuchungsflächen, geführte Weidegänge, Trackpunkte, GPX-Dateien,
          `herds/herds.json` für vollständige Herden-Pakete und `app-data.json` für den vollständigen
          App-Import.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Card className="rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-4 text-sm text-neutral-900">
            <div className="font-medium text-neutral-900">Für QGIS</div>
            <div className="mt-2">`enclosures.geojson`</div>
            <div>`survey_areas.geojson`</div>
            <div>`grazing_sessions.geojson`</div>
            <div>`grazing_trackpoints.geojson`</div>
            <div>`session_events.geojson`</div>
            <div>`enclosure_walk_trackpoints.geojson`</div>
          </Card>
          <Card className="rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-4 text-sm text-neutral-900">
            <div className="font-medium text-neutral-900">Weitere Dateien</div>
            <div className="mt-2">`grazing_sessions.gpx`</div>
            <div>`enclosure_walks.gpx`</div>
            <div>`herds/herds.json`</div>
            <div>`app-data.json`</div>
          </Card>
        </div>

        <FormButton
          type="button"
          onClick={() => void onExportZip()}
          disabled={isExporting}
          variant="primary"
          className="mt-4"
        >
          {isExporting ? 'Erstellt Export ...' : 'ZIP-Export herunterladen'}
        </FormButton>

        <p className="mt-3 text-xs font-medium text-neutral-700">
          GeoPackage ist bewusst noch nicht enthalten, weil im Projekt aktuell keine Schreibbibliothek
          dafür integriert ist.
        </p>
      </CardContent>
    </Card>
  )
}
