import Dexie, { type Table } from 'dexie'
import type { MapBaseLayer } from '@/types/domain'
import type { MapTileRecord } from '@/types/domain'

export const TILE_CACHE_NAME = 'hirtenapp-map-tiles-v1'
export const TILE_DB_NAME = 'hirtenapp-tile-db'
export const MAX_PREFETCH_TILES = 1200
export const PREFETCH_CONCURRENCY = 8
export const TILE_CACHE_CHANGED_EVENT = 'hirtenapp:tile-cache-changed'

export const tileTemplates: Record<MapBaseLayer, string> = {
  'south-tyrol-orthophoto-2023':
    'https://geoservices.buergernetz.bz.it/mapproxy/ows?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=p_bz-Orthoimagery:Aerial-2023-RGB&STYLES=&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/jpeg',
  'south-tyrol-basemap':
    'https://geoservices.buergernetz.bz.it/mapproxy/ows?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=p_bz-BaseMap:Basemap-Standard&STYLES=&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/png',
}

export type TileBounds = {
  north: number
  south: number
  east: number
  west: number
}

export const SOUTH_TYROL_BOUNDS: TileBounds = {
  north: 47.0921,
  south: 45.6726,
  east: 12.4718,
  west: 10.3567,
}

class TileCacheDB extends Dexie {
  mapTiles!: Table<MapTileRecord, string>

  constructor() {
    super(TILE_DB_NAME)

    this.version(1).stores({
      mapTiles: 'url, updatedAt',
    })
  }
}

const tileDb = new TileCacheDB()

function dispatchTileCacheChanged() {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent(TILE_CACHE_CHANGED_EVENT))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function lonToTileX(lon: number, zoom: number) {
  return Math.floor(((lon + 180) / 360) * 2 ** zoom)
}

function latToTileY(lat: number, zoom: number) {
  const safeLat = clamp(lat, -85.05112878, 85.05112878)
  const radians = (safeLat * Math.PI) / 180
  const mercator = Math.log(Math.tan(Math.PI / 4 + radians / 2))
  return Math.floor(((1 - mercator / Math.PI) / 2) * 2 ** zoom)
}

function tileToBBox3857(x: number, y: number, zoom: number) {
  const worldExtent = 20037508.342789244
  const tileCount = 2 ** zoom
  const tileSpan = (worldExtent * 2) / tileCount
  const minX = -worldExtent + x * tileSpan
  const maxX = minX + tileSpan
  const maxY = worldExtent - y * tileSpan
  const minY = maxY - tileSpan

  return [minX, minY, maxX, maxY].map((value) => value.toFixed(6)).join(',')
}

export function getPrefetchBounds(lat: number, lon: number, radiusKm: number) {
  const latDelta = radiusKm / 110.574
  const lonDelta = radiusKm / (111.32 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2))

  return {
    north: clamp(lat + latDelta, -85.05112878, 85.05112878),
    south: clamp(lat - latDelta, -85.05112878, 85.05112878),
    east: clamp(lon + lonDelta, -180, 180),
    west: clamp(lon - lonDelta, -180, 180),
  }
}

export function buildPrefetchUrlsForBounds(
  layers: MapBaseLayer[],
  bounds: TileBounds,
  minZoom: number,
  maxZoom: number
) {
  const urls: string[] = []

  for (let zoom = minZoom; zoom <= maxZoom; zoom += 1) {
    const maxTileIndex = 2 ** zoom - 1
    const xMin = clamp(lonToTileX(bounds.west, zoom), 0, maxTileIndex)
    const xMax = clamp(lonToTileX(bounds.east, zoom), 0, maxTileIndex)
    const yMin = clamp(latToTileY(bounds.north, zoom), 0, maxTileIndex)
    const yMax = clamp(latToTileY(bounds.south, zoom), 0, maxTileIndex)

    for (let x = xMin; x <= xMax; x += 1) {
      for (let y = yMin; y <= yMax; y += 1) {
        const bbox = tileToBBox3857(x, y, zoom)

        layers.forEach((layer) => {
          urls.push(tileTemplates[layer].replace('{bbox-epsg-3857}', bbox))
        })
      }
    }
  }

  return urls
}

export function buildPrefetchUrlsForRadius(
  layers: MapBaseLayer[],
  lat: number,
  lon: number,
  radiusKm: number,
  minZoom: number,
  maxZoom: number
) {
  return buildPrefetchUrlsForBounds(
    layers,
    getPrefetchBounds(lat, lon, radiusKm),
    minZoom,
    maxZoom
  )
}

export async function getTileCacheCount() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return await tileDb.mapTiles.count()
  } catch {
    return null
  }
}

export async function clearTileCacheStorage() {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    await tileDb.mapTiles.clear()

    if ('caches' in window) {
      await window.caches.delete(TILE_CACHE_NAME)
    }

    dispatchTileCacheChanged()
    return true
  } catch {
    return false
  }
}

export async function getPersistentStorageStatus() {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) {
    return null
  }

  try {
    return await navigator.storage.persisted()
  } catch {
    return null
  }
}

export async function requestPersistentStorage() {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return null
  }

  try {
    return await navigator.storage.persist()
  } catch {
    return null
  }
}

async function persistTileResponse(
  request: Request,
  response: Response,
  cache?: Cache | null
) {
  if (cache) {
    await cache.put(request, response.clone())
  }

  // Opaque responses cannot be reliably serialized into IndexedDB.
  if (response.type === 'opaque') {
    return
  }

  const blob = await response.clone().blob()
  await tileDb.mapTiles.put({
    url: request.url,
    blob,
    contentType: response.headers.get('content-type') ?? undefined,
    status: response.status,
    updatedAt: new Date().toISOString(),
  })
}

export async function prefetchTileUrls(
  urls: string[],
  onProgress?: (completed: number, total: number) => void
) {
  if (typeof window === 'undefined') {
    throw new Error('Browser-APIs sind nicht verfuegbar.')
  }

  const cache = 'caches' in window ? await window.caches.open(TILE_CACHE_NAME) : null
  let completed = 0

  for (let index = 0; index < urls.length; index += PREFETCH_CONCURRENCY) {
    const batch = urls.slice(index, index + PREFETCH_CONCURRENCY)

    await Promise.all(
      batch.map(async (url) => {
        const request = new Request(url, {
          method: 'GET',
          mode: 'cors',
          cache: 'reload',
        })
        const response = await fetch(request)

        if (response.ok || response.type === 'opaque') {
          await persistTileResponse(request, response, cache)
        } else {
          throw new Error(`Tile konnte nicht geladen werden: ${response.status}`)
        }

        completed += 1
        onProgress?.(completed, urls.length)
      })
    )
  }

  dispatchTileCacheChanged()
}
