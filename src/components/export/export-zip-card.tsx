'use client'

type ExportZipCardProps = {
  isExporting: boolean
  onExportZip: () => void | Promise<void>
}

export function ExportZipCard({ isExporting, onExportZip }: ExportZipCardProps) {
  return (
    <section className="rounded-3xl border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
      <h2 className="text-lg font-semibold">ZIP-Export</h2>
      <p className="mt-2 text-sm font-medium text-neutral-800">
        Enthält Pferche, Untersuchungsflächen, geführte Weidegänge, Trackpunkte, GPX-Dateien,
        `herds/herds.json` für vollständige Herden-Pakete und `app-data.json` für den vollständigen
        App-Import.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-4 text-sm text-neutral-900">
          <div className="font-medium text-neutral-900">Für QGIS</div>
          <div className="mt-2">`enclosures.geojson`</div>
          <div>`survey_areas.geojson`</div>
          <div>`grazing_sessions.geojson`</div>
          <div>`grazing_trackpoints.geojson`</div>
          <div>`session_events.geojson`</div>
          <div>`enclosure_walk_trackpoints.geojson`</div>
        </div>
        <div className="rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-4 text-sm text-neutral-900">
          <div className="font-medium text-neutral-900">Weitere Dateien</div>
          <div className="mt-2">`grazing_sessions.gpx`</div>
          <div>`enclosure_walks.gpx`</div>
          <div>`herds/herds.json`</div>
          <div>`app-data.json`</div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void onExportZip()}
        disabled={isExporting}
        className="mt-4 rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-4 py-4 font-semibold text-[#17130f] disabled:opacity-50"
      >
        {isExporting ? 'Erstellt Export ...' : 'ZIP-Export herunterladen'}
      </button>

      <p className="mt-3 text-xs font-medium text-neutral-700">
        GeoPackage ist bewusst noch nicht enthalten, weil im Projekt aktuell keine Schreibbibliothek
        dafür integriert ist.
      </p>
    </section>
  )
}
