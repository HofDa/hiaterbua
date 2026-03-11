'use client'

import { SettingsPageHeader } from '@/components/settings/settings-page-header'
import { SettingsGeneralFormCard } from '@/components/settings/settings-general-form-card'
import { SettingsPrefetchCard } from '@/components/settings/settings-prefetch-card'
import { useSettingsPagePreferences } from '@/components/settings/hooks/use-settings-page-preferences'
import { useSettingsPrefetch } from '@/components/settings/hooks/use-settings-prefetch'

export default function SettingsPage() {
  const {
    draft,
    setDraft,
    settingsReady,
    settingsStorageWarning,
    status,
    saving,
    setTileCacheCount,
    saveSettings,
    resetSettings,
    tileCachePanel,
  } = useSettingsPagePreferences()

  const { prefetchState, prefetchActions } = useSettingsPrefetch({
    tileCachingEnabled: draft.tileCachingEnabled,
    currentBaseLayer: draft.mapBaseLayer,
    onTileCacheCountChange: (count) => setTileCacheCount(count),
  })

  return (
    <div className="space-y-5">
      <SettingsPageHeader
        settingsReady={settingsReady}
        settingsStorageWarning={settingsStorageWarning}
      />

      <SettingsGeneralFormCard
        draft={draft}
        setDraft={setDraft}
        status={status}
        saving={saving}
        onSubmit={saveSettings}
        onResetSettings={resetSettings}
        tileCachePanel={tileCachePanel}
      />

      <SettingsPrefetchCard
        state={prefetchState}
        actions={prefetchActions}
      />
    </div>
  )
}
