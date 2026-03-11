import type { MapBaseLayer } from '@/types/domain'

export const settingsMapOptions: { value: MapBaseLayer; label: string }[] = [
  { value: 'south-tyrol-orthophoto-2023', label: 'Orthofoto 2023 (20 cm)' },
  { value: 'south-tyrol-basemap', label: 'BaseMap Südtirol' },
]

export const prefetchLayerOptions = [
  { value: 'current', label: 'Aktuelle Kartengrundlage' },
  { value: 'south-tyrol-orthophoto-2023', label: 'Nur Orthofoto 2023' },
  { value: 'south-tyrol-basemap', label: 'Nur BaseMap Südtirol' },
  { value: 'both', label: 'Beide Layer' },
] as const

export type PrefetchLayerChoice = (typeof prefetchLayerOptions)[number]['value']
export type SettingsStorageMode = 'db' | 'fallback'
