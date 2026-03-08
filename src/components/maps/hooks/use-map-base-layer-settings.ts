import { useEffect, useRef } from 'react'
import { db } from '@/lib/db/dexie'
import { defaultAppSettings, normalizeMapBaseLayer } from '@/lib/settings/defaults'
import type { AppSettings, MapBaseLayer } from '@/types/domain'

type UseMapBaseLayerSettingsOptions = {
  settings: AppSettings | null | undefined
  setBaseLayer: (value: MapBaseLayer) => void
  mode?: 'once' | 'always'
}

export function useMapBaseLayerSettings({
  settings,
  setBaseLayer,
  mode = 'always',
}: UseMapBaseLayerSettingsOptions) {
  const hasLoadedSettingsRef = useRef(false)

  useEffect(() => {
    if (mode === 'once' && hasLoadedSettingsRef.current) return
    if (settings === undefined) return

    hasLoadedSettingsRef.current = true

    if (!settings) {
      void db.settings.put(defaultAppSettings)
      return
    }

    setBaseLayer(normalizeMapBaseLayer(settings.mapBaseLayer))
  }, [mode, setBaseLayer, settings])
}
