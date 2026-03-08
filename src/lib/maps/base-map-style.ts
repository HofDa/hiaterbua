import type { LngLatLike, StyleSpecification } from 'maplibre-gl'

export const fallbackCenter: LngLatLike = [11.35, 46.5]

export const southTyrolBaseMapLayerId = 'south-tyrol-basemap'
export const southTyrolBaseMapSourceId = 'south-tyrol-basemap-source'
export const southTyrolOrthoLayerId = 'south-tyrol-orthophoto-2023'
export const southTyrolOrthoSourceId = 'south-tyrol-orthophoto-2023-source'

export const southTyrolBaseMapTiles = [
  'https://geoservices.buergernetz.bz.it/mapproxy/ows?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=p_bz-BaseMap:Basemap-Standard&STYLES=&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/png',
]

export const southTyrolOrthoTiles = [
  'https://geoservices.buergernetz.bz.it/mapproxy/ows?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=p_bz-Orthoimagery:Aerial-2023-RGB&STYLES=&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/jpeg',
]

export const rasterStyle: StyleSpecification = {
  version: 8,
  sources: {
    [southTyrolBaseMapSourceId]: {
      type: 'raster' as const,
      tiles: southTyrolBaseMapTiles,
      tileSize: 256,
      attribution: 'Provincia autonoma di Bolzano - BaseMap Suedtirol',
      maxzoom: 20,
    },
  },
  layers: [
    {
      id: southTyrolBaseMapLayerId,
      type: 'raster' as const,
      source: southTyrolBaseMapSourceId,
    },
  ],
}
