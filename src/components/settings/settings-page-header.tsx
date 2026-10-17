'use client'

type SettingsPageHeaderProps = {
  settingsReady: boolean
  settingsStorageWarning: string
}

export function SettingsPageHeader({
  settingsReady,
  settingsStorageWarning,
}: SettingsPageHeaderProps) {
  return (
    // No title card: the top bar already says "Einstellungen". The h1 stays
    // for screen readers.
    <section className="space-y-3">
      <h1 className="sr-only">Einstellungen</h1>
      {!settingsReady ? (
        <div className="rounded-[1.25rem] border border-border bg-surface-raised px-4 py-3 text-sm font-medium text-ink-soft">
          Einstellungen werden geladen ...
        </div>
      ) : null}
      {settingsStorageWarning ? (
        <div className="rounded-[1.25rem] border border-warning-border bg-warning-callout px-4 py-3 text-sm font-semibold text-warning-ink">
          {settingsStorageWarning}
        </div>
      ) : null}
    </section>
  )
}
