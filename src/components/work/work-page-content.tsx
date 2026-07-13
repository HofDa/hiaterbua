'use client'

import { useMemo, useState } from 'react'
import { WorkPageHero } from '@/components/work/work-page-hero'
import { WorkOverviewCard } from '@/components/work/work-overview-card'
import { WorkReminderBanner } from '@/components/work/work-reminder-banner'
import { WorkSessionControlCard } from '@/components/work/work-session-control-card'
import { WorkSessionHistoryCard } from '@/components/work/work-session-history-card'
import { useWorkPageController } from '@/components/work/hooks/use-work-page-controller'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import type { Enclosure, Herd, WorkSession } from '@/types/domain'

// The field screen shows just enough history to confirm "did I log that?";
// the full (capped) list stays one tap away instead of pushing the start
// controls off-screen.
const COLLAPSED_HISTORY_COUNT = 3
const MAX_HISTORY_COUNT = 12

type WorkPageContentProps = {
  sessions: WorkSession[]
  herds: Herd[]
  enclosures: Enclosure[]
}

export function WorkPageContent({
  sessions,
  herds,
  enclosures,
}: WorkPageContentProps) {
  const [showFullHistory, setShowFullHistory] = useState(false)
  const visibleSessions = useMemo(
    () => sessions.slice(0, showFullHistory ? MAX_HISTORY_COUNT : COLLAPSED_HISTORY_COUNT),
    [sessions, showFullHistory]
  )
  const herdsById = useMemo(() => new Map(herds.map((herd) => [herd.id, herd])), [herds])
  const enclosuresById = useMemo(
    () => new Map(enclosures.map((enclosure) => [enclosure.id, enclosure])),
    [enclosures]
  )

  const {
    activeSession,
    nextReminderMs,
    nowMs,
    workPickerSectionId,
    workType,
    workActivityId,
    selectedHerdId,
    selectedEnclosureId,
    reminderIntervalMin,
    notes,
    statusMessage,
    error,
    isSaving,
    activeReminderMessage,
    editingSessionId,
    editWorkPickerSectionId,
    editWorkType,
    editWorkActivityId,
    editSelectedHerdId,
    editSelectedEnclosureId,
    editReminderIntervalMin,
    editStartTime,
    editEndTime,
    editNotes,
    setWorkPickerSectionId,
    setSelectedHerdId,
    setSelectedEnclosureId,
    setReminderIntervalMin,
    setNotes,
    setActiveReminderMessage,
    setEditWorkPickerSectionId,
    setEditSelectedHerdId,
    setEditSelectedEnclosureId,
    setEditReminderIntervalMin,
    setEditStartTime,
    setEditEndTime,
    setEditNotes,
    applyWorkSelection,
    applyEditWorkSelection,
    startWorkSession,
    updateWorkSessionStatus,
    startEditingSession,
    cancelEditingSession,
    saveEditedSession,
    deleteWorkSession,
  } = useWorkPageController({ sessions })

  return (
    <div className="space-y-4">
      {activeReminderMessage ? (
        <WorkReminderBanner
          activeReminderMessage={activeReminderMessage}
          onDismiss={() => setActiveReminderMessage('')}
        />
      ) : null}

      <WorkPageHero />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <WorkSessionControlCard
          activeSession={activeSession}
          nextReminderMs={nextReminderMs}
          nowMs={nowMs}
          herdsById={herdsById}
          enclosuresById={enclosuresById}
          herds={herds}
          enclosures={enclosures}
          isSaving={isSaving}
          workPickerSectionId={workPickerSectionId}
          workType={workType}
          workActivityId={workActivityId}
          selectedHerdId={selectedHerdId}
          selectedEnclosureId={selectedEnclosureId}
          reminderIntervalMin={reminderIntervalMin}
          notes={notes}
          error={error}
          statusMessage={statusMessage}
          onStartWorkSession={startWorkSession}
          onUpdateWorkSessionStatus={updateWorkSessionStatus}
          onWorkPickerSectionChange={setWorkPickerSectionId}
          onWorkSelectionChange={applyWorkSelection}
          onSelectedHerdIdChange={setSelectedHerdId}
          onSelectedEnclosureIdChange={setSelectedEnclosureId}
          onReminderIntervalMinChange={setReminderIntervalMin}
          onNotesChange={setNotes}
        />

        <WorkOverviewCard sessions={sessions} nowMs={nowMs} />
      </section>

      <WorkSessionHistoryCard
        sessions={visibleSessions}
        nowMs={nowMs}
        isSaving={isSaving}
        editingSessionId={editingSessionId}
        herdsById={herdsById}
        enclosuresById={enclosuresById}
        herds={herds}
        enclosures={enclosures}
        editWorkPickerSectionId={editWorkPickerSectionId}
        editWorkType={editWorkType}
        editWorkActivityId={editWorkActivityId}
        editSelectedHerdId={editSelectedHerdId}
        editSelectedEnclosureId={editSelectedEnclosureId}
        editReminderIntervalMin={editReminderIntervalMin}
        editStartTime={editStartTime}
        editEndTime={editEndTime}
        editNotes={editNotes}
        error={error}
        onStartEditingSession={startEditingSession}
        onCancelEditingSession={cancelEditingSession}
        onDeleteWorkSession={deleteWorkSession}
        onSaveEditedSession={saveEditedSession}
        onEditWorkPickerSectionChange={setEditWorkPickerSectionId}
        onEditWorkSelectionChange={applyEditWorkSelection}
        onEditSelectedHerdIdChange={setEditSelectedHerdId}
        onEditSelectedEnclosureIdChange={setEditSelectedEnclosureId}
        onEditReminderIntervalMinChange={setEditReminderIntervalMin}
        onEditStartTimeChange={setEditStartTime}
        onEditEndTimeChange={setEditEndTime}
        onEditNotesChange={setEditNotes}
      />

      {sessions.length > COLLAPSED_HISTORY_COUNT ? (
        <button
          type="button"
          onClick={() => setShowFullHistory((current) => !current)}
          className={cn(buttonVariants({ variant: 'secondary' }), 'w-full rounded-full sm:w-auto')}
        >
          {showFullHistory
            ? 'Weniger anzeigen'
            : `Verlauf anzeigen (${Math.min(sessions.length, MAX_HISTORY_COUNT)})`}
        </button>
      ) : null}
    </div>
  )
}
