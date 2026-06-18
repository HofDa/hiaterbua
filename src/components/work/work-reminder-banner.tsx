'use client'

import { MetaLabel } from '@/components/ui/typography'

type WorkReminderBannerProps = {
  activeReminderMessage: string
  onDismiss: () => void
}

export function WorkReminderBanner({
  activeReminderMessage,
  onDismiss,
}: WorkReminderBannerProps) {
  return (
    <section className="rounded-3xl border border-border bg-surface-raised p-4 shadow-[0_16px_30px_rgba(40,34,26,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <MetaLabel tracking="wide" tone="soft">
            Erinnerung aktiv
          </MetaLabel>
          <div className="mt-1 text-base font-semibold text-ink">
            {activeReminderMessage}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-2xl border border-border bg-surface-raised px-4 py-3 text-sm font-semibold text-ink shadow-sm"
        >
          Erledigt
        </button>
      </div>
    </section>
  )
}
