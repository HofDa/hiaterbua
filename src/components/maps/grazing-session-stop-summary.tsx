'use client'

import type { LastStoppedSession } from '@/components/maps/hooks/use-grazing-session-map-state'
import { SavedSummaryCard } from '@/components/ui/saved-summary-card'
import { formatDistance, formatDurationWords } from '@/lib/maps/grazing-session-map-helpers'

/** The end of a walk, in the shared "saved + undo" form. */
export function GrazingSessionStopSummary({
  stopped,
  isSaving,
  onUndo,
  onShowInHistory,
  onDismiss,
}: {
  stopped: LastStoppedSession
  isSaving: boolean
  onUndo: () => void | Promise<void>
  onShowInHistory: () => void
  onDismiss: () => void
}) {
  return (
    <SavedSummaryCard
      title="Weidegang gespeichert"
      subtitle={stopped.herdName}
      stats={[
        { label: 'Dauer', value: formatDurationWords(stopped.durationS) },
        { label: 'Strecke', value: formatDistance(stopped.distanceM) },
        { label: 'Tiere', value: stopped.animalCount !== null ? String(stopped.animalCount) : '–' },
      ]}
      savedAt={stopped.stoppedAt}
      undoLabel="Rückgängig – weiter aufzeichnen"
      isBusy={isSaving}
      onUndo={onUndo}
      secondaryAction={{ label: 'Im Verlauf ansehen', onClick: onShowInHistory }}
      onDismiss={onDismiss}
    />
  )
}
