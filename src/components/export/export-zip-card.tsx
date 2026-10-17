'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown } from 'lucide-react'
import { FormButton } from '@/components/ui/form'

type ExportZipCardProps = {
  isExporting: boolean
  onExportZip: () => void | Promise<void>
}

export function ExportZipCard({ isExporting, onExportZip }: ExportZipCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alles sichern</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mt-2 text-sm font-medium text-ink-soft">
          Eine ZIP-Datei mit allen Herden, Pferchen, Weidegängen samt GPS-Spuren und
          Arbeitseinsätzen. Damit lässt sich alles wiederherstellen.
        </p>

        <FormButton
          type="button"
          onClick={() => void onExportZip()}
          disabled={isExporting}
          variant="primary"
          className="mt-4 min-h-12 w-full text-base sm:w-auto"
        >
          {isExporting ? 'Erstellt Sicherung …' : 'Alles sichern (ZIP)'}
        </FormButton>

        {/* File lists are for the GIS/office side, not the shepherd. */}
        <details className="group mt-4 rounded-[1.1rem] border border-border-soft px-4 py-2">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink-strong [&::-webkit-details-marker]:hidden">
            Was ist drin?
            <ChevronDown aria-hidden="true" className="h-5 w-5 text-ink-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-4 pb-2 pt-1 text-sm text-ink md:grid-cols-2">
            <div>
              <div className="font-semibold text-ink-strong">Für QGIS (GeoJSON)</div>
              <ul className="mt-1 space-y-0.5 font-mono text-xs">
                <li>enclosures.geojson</li>
                <li>survey_areas.geojson</li>
                <li>grazing_sessions.geojson</li>
                <li>grazing_trackpoints.geojson</li>
                <li>session_events.geojson</li>
                <li>enclosure_walk_trackpoints.geojson</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-ink-strong">Weitere Dateien</div>
              <ul className="mt-1 space-y-0.5 font-mono text-xs">
                <li>grazing_sessions.gpx</li>
                <li>enclosure_walks.gpx</li>
                <li>herds/herds.json</li>
                <li>app-data.json (für die Wiederherstellung)</li>
              </ul>
            </div>
            <p className="text-xs font-medium text-ink-muted md:col-span-2">
              GeoPackage (.gpkg) wird noch nicht unterstützt.
            </p>
          </div>
        </details>
      </CardContent>
    </Card>
  )
}
