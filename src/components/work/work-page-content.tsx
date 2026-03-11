'use client'

import { useMemo } from 'react'
import { WorkPageHero } from '@/components/work/work-page-hero'
import { WorkOverviewCard } from '@/components/work/work-overview-card'
import { WorkReminderBanner } from '@/components/work/work-reminder-banner'
import { WorkSessionControlCard } from '@/components/work/work-session-control-card'
import { WorkSessionHistoryCard } from '@/components/work/work-session-history-card'
import { WorkUserCard } from '@/components/work/work-user-card'
import { useWorkPageController } from '@/components/work/hooks/use-work-page-controller'
import type { Enclosure, Herd, WorkSession } from '@/types/domain'

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
  const visibleSessions = useMemo(() => sessions.slice(0, 12), [sessions])
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
      <WorkUserCard />

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

        <WorkOverviewCard activeSession={activeSession} sessions={sessions} nowMs={nowMs} />
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
    </div>
  )
}
