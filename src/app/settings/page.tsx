'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { SettingsPageHeader } from '@/components/settings/settings-page-header'
import { SettingsGeneralFormCard } from '@/components/settings/settings-general-form-card'
import { SettingsPrefetchCard } from '@/components/settings/settings-prefetch-card'
import { WorkUserCard } from '@/components/work/work-user-card'
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
    browserNotificationPermission,
    requestBrowserNotifications,
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
        browserNotificationPermission={browserNotificationPermission}
        onRequestBrowserNotifications={requestBrowserNotifications}
        tileCachePanel={tileCachePanel}
      />

      {/* Who is recording work sessions — settings content, so it lives here
          instead of crowding the Arbeit field screen. */}
      <WorkUserCard />

      <SettingsPrefetchCard
        state={prefetchState}
        actions={prefetchActions}
      />

      <Link
        href="/settings/diagnostics"
        className="flex min-h-12 items-center justify-between gap-3 rounded-[1.1rem] border-2 border-border-strong bg-surface-raised px-4 text-base font-semibold text-ink-strong"
      >
        <span>
          Feld-Diagnose
          <span className="block text-sm font-medium text-ink-muted">Für Fehlerberichte</span>
        </span>
        <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0" />
      </Link>
    </div>
  )
}
