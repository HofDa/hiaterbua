'use client'

import { useEffect, useRef } from 'react'
import type { LngLatLike, Map as MapLibreMap, Marker, StyleSpecification } from 'maplibre-gl'

const previewCenter: LngLatLike = [11.35, 46.5]
const previewBaseLayerId = 'settings-preview-basemap'
const previewBaseSourceId = 'settings-preview-basemap-source'
const previewRasterStyle: StyleSpecification = {
  version: 8,
  sources: {
    [previewBaseSourceId]: {
      type: 'raster',
      tiles: [
        'https://geoservices.buergernetz.bz.it/mapproxy/ows?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=p_bz-BaseMap:Basemap-Standard&STYLES=&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/png',
      ],
      tileSize: 256,
      attribution: 'Provincia autonoma di Bolzano - BaseMap Suedtirol',
      maxzoom: 20,
    },
  },
  layers: [
    {
      id: previewBaseLayerId,
      type: 'raster',
      source: previewBaseSourceId,
    },
  ],
}

type PositionPreviewMapProps = {
  latitude: number
  longitude: number
}

export function PositionPreviewMap({
  latitude,
  longitude,
}: PositionPreviewMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markerRef = useRef<Marker | null>(null)

  useEffect(() => {
    let cancelled = false

    async function setupMap() {
      if (!containerRef.current || mapRef.current) return

      const maplibre = await import('maplibre-gl')
      if (cancelled || !containerRef.current) return

      const map = new maplibre.Map({
        container: containerRef.current,
        style: previewRasterStyle,
        center: previewCenter,
        zoom: 9,
      })

      map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right')

      mapRef.current = map
      markerRef.current = new maplibre.Marker({
        color: '#111827',
      })
    }

    void setupMap()

    return () => {
      cancelled = true
      markerRef.current?.remove()
      markerRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    if (!map || !marker) return

    const lngLat: LngLatLike = [longitude, latitude]
    marker.setLngLat(lngLat).addTo(map)
    map.easeTo({
      center: lngLat,
      zoom: Math.max(map.getZoom(), 14),
      duration: 700,
    })
  }, [latitude, longitude])

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[#ccb98a] bg-[rgba(255,253,246,0.88)] shadow-sm">
      <div
        ref={containerRef}
        className="h-64 w-full"
        aria-label="Kartenansicht der aktuellen Position"
      />
    </div>
  )
}
