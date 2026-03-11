'use client'

export function ExportPageHeader() {
  return (
    <section className="rounded-3xl border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
      <h1 className="text-2xl font-semibold">Im-/Export</h1>
      <p className="mt-2 text-sm font-medium text-neutral-800">
        QGIS-taugliche Raumdaten als GeoJSON, Spuren zusätzlich als GPX und übrige App-Daten als
        JSON bündeln oder wieder einlesen.
      </p>
    </section>
  )
}
