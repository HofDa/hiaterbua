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
    <section className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Einstellungen</h1>
      <p className="mt-2 max-w-2xl text-sm font-medium text-neutral-800">
        Kartenbasis, GPS-Schwellen und Offline-Verhalten lokal verwalten.
      </p>
      {!settingsReady ? (
        <div className="mt-3 rounded-[1.25rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-neutral-800">
          Einstellungen werden geladen ...
        </div>
      ) : null}
      {settingsStorageWarning ? (
        <div className="mt-3 rounded-[1.25rem] border border-amber-300 bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-950">
          {settingsStorageWarning}
        </div>
      ) : null}
    </section>
  )
}
