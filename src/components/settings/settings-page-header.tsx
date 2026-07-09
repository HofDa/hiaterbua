'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

type SettingsPageHeaderProps = {
  settingsReady: boolean
  settingsStorageWarning: string
}

export function SettingsPageHeader({
  settingsReady,
  settingsStorageWarning,
}: SettingsPageHeaderProps) {
  return (
    <section className="app-panel p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Einstellungen</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-ink-soft">
            Kartenbasis, GPS-Schwellen und Offline-Verhalten lokal verwalten.
          </p>
        </div>
        <Link
          href="/settings/diagnostics"
          className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'rounded-full')}
        >
          Feld-Diagnose
        </Link>
      </div>
      {!settingsReady ? (
        <div className="mt-3 rounded-[1.25rem] border border-border bg-surface-raised px-4 py-3 text-sm font-medium text-ink-soft">
          Einstellungen werden geladen ...
        </div>
      ) : null}
      {settingsStorageWarning ? (
        <div className="mt-3 rounded-[1.25rem] border border-warning-border bg-warning-callout px-4 py-3 text-sm font-semibold text-warning-ink">
          {settingsStorageWarning}
        </div>
      ) : null}
    </section>
  )
}
