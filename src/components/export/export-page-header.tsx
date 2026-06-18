'use client'

export function ExportPageHeader() {
  return (
    <section className="app-panel p-5">
      <h1 className="text-2xl font-semibold">Im-/Export</h1>
      <p className="mt-2 text-sm font-medium text-ink-soft">
        QGIS-taugliche Raumdaten als GeoJSON, Spuren zusätzlich als GPX und übrige App-Daten als
        JSON bündeln oder wieder einlesen.
      </p>
    </section>
  )
}
