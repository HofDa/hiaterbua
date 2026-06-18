'use client'

import { formatAccuracy } from '@/lib/maps/map-core'
import {
  formatDistance,
  formatDuration,
  type SessionMetrics,
} from '@/lib/maps/grazing-session-map-helpers'
import {
  PauseIcon,
  PlayIcon,
  StopIcon,
  TrackpointsIcon,
} from '@/components/maps/map-toolbar-icons'
import {
  MobileMapToolbar,
  MobileMapToolbarButton,
  MobileMapToolbarStat,
} from '@/components/maps/mobile-map-toolbar'
import { MobileMapFloatingCard } from '@/components/maps/mobile-map-ui'
import { FormSelect, FormInput } from '@/components/ui/form'
import { StatusAlert, ErrorAlert } from '@/components/ui/alert'
import type {
  Herd,
  SessionEvent,
  SessionEventType,
  SessionStatus,
} from '@/types/domain'

const quickEventButtons: Array<{ type: SessionEventType; label: string }> = [
  { type: 'water', label: 'Wasser' },
  { type: 'rest', label: 'Rast-Ort' },
  { type: 'disturbance', label: 'Störung' },
  { type: 'move', label: 'Punkt' },
]

type GrazingSessionMapDesktopManagementOverlayProps = {
  safeHerds: Herd[]
  selectedHerdId: string
  selectedAnimalCount: number | null
  sessionNotes: string
  currentSessionStatus: SessionStatus | null
  isSaving: boolean
  isEventSaving: boolean
  eventNote: string
  eventStatus: string
  actionError: string
  safeCurrentTrackpointsLength: number
  currentMetrics: SessionMetrics | null
  safeCurrentSessionEvents: SessionEvent[]
  onSelectedHerdIdChange: (value: string) => void
  onAdjustAnimalCount: (delta: number) => void | Promise<void>
  onSessionNotesChange: (value: string) => void
  onStartSession: () => void | Promise<void>
  onPauseSession: () => void | Promise<void>
  onResumeSession: () => void | Promise<void>
  onStopSession: () => void | Promise<void>
  onEventNoteChange: (value: string) => void
  onAddSessionMarkerEvent: (type: SessionEventType, comment?: string) => void | Promise<void>
}

export function GrazingSessionMapDesktopManagementOverlay({
  safeHerds,
  selectedHerdId,
  selectedAnimalCount,
  sessionNotes,
  currentSessionStatus,
  isSaving,
  isEventSaving,
  eventNote,
  eventStatus,
  actionError,
  safeCurrentTrackpointsLength,
  currentMetrics,
  safeCurrentSessionEvents,
  onSelectedHerdIdChange,
  onAdjustAnimalCount,
  onSessionNotesChange,
  onStartSession,
  onPauseSession,
  onResumeSession,
  onStopSession,
  onEventNoteChange,
  onAddSessionMarkerEvent,
}: GrazingSessionMapDesktopManagementOverlayProps) {
  const hasSelectedHerd = selectedHerdId.length > 0
  const animalCount = selectedAnimalCount ?? 0
  const summary = currentSessionStatus
    ? `${currentSessionStatus === 'active' ? 'Läuft' : 'Pausiert'} · ${safeCurrentSessionEvents.length} Ereignisse`
    : selectedHerdId
      ? 'Herde gewählt · bereit'
      : 'Bereit zum Start'

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden p-4 lg:block">
      <MobileMapFloatingCard className="bg-surface-glass p-3 backdrop-blur-[3px] xl:p-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3 xl:gap-3">
          <div className="min-w-[11rem] flex-1">
            <div className="text-lg font-semibold text-ink-strong">Weidegang verwalten</div>
            <div className="mt-1 text-xs font-medium text-ink-muted">{summary}</div>
          </div>

          <MobileMapToolbar>
            <MobileMapToolbarStat>
              <span className="inline-flex items-center gap-1">
                <TrackpointsIcon />
                <span>
                  {safeCurrentTrackpointsLength} · {formatDistance(currentMetrics?.distanceM ?? 0)}
                </span>
              </span>
            </MobileMapToolbarStat>
            <MobileMapToolbarStat>{formatDuration(currentMetrics?.durationS ?? 0)}</MobileMapToolbarStat>
            <MobileMapToolbarStat>
              {formatAccuracy(currentMetrics?.avgAccuracyM)}
            </MobileMapToolbarStat>
            <MobileMapToolbarButton
              aria-label="Weidegang starten"
              title="Weidegang starten"
              onClick={() => void onStartSession()}
              disabled={isSaving || currentSessionStatus !== null || safeHerds.length === 0}
              variant="primary"
              label="Start"
            >
              <PlayIcon />
            </MobileMapToolbarButton>
            <MobileMapToolbarButton
              aria-label="Pausieren"
              title="Pausieren"
              onClick={() => void onPauseSession()}
              disabled={isSaving || currentSessionStatus !== 'active'}
              label="Pause"
            >
              <PauseIcon />
            </MobileMapToolbarButton>
            <MobileMapToolbarButton
              aria-label="Fortsetzen"
              title="Fortsetzen"
              onClick={() => void onResumeSession()}
              disabled={isSaving || currentSessionStatus !== 'paused'}
              label="Weiter"
            >
              <PlayIcon />
            </MobileMapToolbarButton>
            <MobileMapToolbarButton
              aria-label="Weidegang beenden"
              title="Weidegang beenden"
              onClick={() => void onStopSession()}
              disabled={
                isSaving ||
                (currentSessionStatus !== 'active' && currentSessionStatus !== 'paused')
              }
              label="Stop"
            >
              <StopIcon />
            </MobileMapToolbarButton>
          </MobileMapToolbar>
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-2 xl:gap-3">
          <div className="min-w-[11rem] flex-[1_1_12rem]">
            <label
              htmlFor="desktop-grazing-herd"
              className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
            >
              Herde
            </label>
            <FormSelect
              id="desktop-grazing-herd"
              value={selectedHerdId}
              onChange={(event) => onSelectedHerdIdChange(event.target.value)}
              disabled={currentSessionStatus !== null}
              className="h-11 w-full"
            >
              <option value="">Bitte wählen</option>
              {safeHerds.map((herd) => (
                <option key={herd.id} value={herd.id}>
                  {herd.name}
                </option>
              ))}
            </FormSelect>
          </div>

          <div className="min-w-[11rem] flex-[0_1_13rem]">
            <div className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              Tiere im Weidegang
            </div>
            <div className="flex h-11 items-center gap-2 rounded-2xl border border-border bg-surface-raised px-2">
              <button
                type="button"
                onClick={() => void onAdjustAnimalCount(-1)}
                disabled={!hasSelectedHerd || animalCount <= 0}
                aria-label="Tierzahl verringern"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border-strong bg-surface-muted text-base font-semibold text-ink disabled:opacity-40"
              >
                −
              </button>
              <div className="min-w-0 flex-1 text-center">
                <div className="text-sm font-semibold text-ink-strong">{animalCount}</div>
              </div>
              <button
                type="button"
                onClick={() => void onAdjustAnimalCount(1)}
                disabled={!hasSelectedHerd}
                aria-label="Tierzahl erhöhen"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border-strong bg-surface-muted text-base font-semibold text-ink disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          <div className="min-w-[13rem] flex-[1.2_1_16rem]">
            <label
              htmlFor="desktop-grazing-session-note"
              className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
            >
              Notiz zum Weidegang
            </label>
            <FormInput
              id="desktop-grazing-session-note"
              value={sessionNotes}
              onChange={(event) => onSessionNotesChange(event.target.value)}
              disabled={currentSessionStatus !== null}
              className="h-11 w-full"
              placeholder="optionale Begleitnotiz"
            />
          </div>
        </div>

        {currentSessionStatus ? (
          <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3 xl:gap-3">
            <div className="flex flex-wrap gap-2">
              {quickEventButtons.map((eventButton) => (
                <button
                  key={eventButton.type}
                  type="button"
                  onClick={() => void onAddSessionMarkerEvent(eventButton.type)}
                  disabled={isEventSaving}
                  className="pointer-events-auto h-10 rounded-2xl border border-border bg-surface-raised px-3 text-sm font-semibold text-ink disabled:opacity-50"
                >
                  {eventButton.label}
                </button>
              ))}
            </div>

            <div className="min-w-[12rem] flex-[1_1_14rem]">
              <label
                htmlFor="desktop-grazing-event-note"
                className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
              >
                Ereignisnotiz
              </label>
              <FormInput
                id="desktop-grazing-event-note"
                value={eventNote}
                onChange={(event) => onEventNoteChange(event.target.value)}
                className="h-10 w-full"
                placeholder="Bemerkung zum aktuellen Weidegang"
              />
            </div>

            <button
              type="button"
              onClick={() => void onAddSessionMarkerEvent('note', eventNote)}
              disabled={isEventSaving || !eventNote.trim()}
              className="pointer-events-auto h-10 shrink-0 rounded-2xl border border-border-strong bg-surface-muted px-4 text-sm font-semibold text-ink disabled:opacity-50"
            >
              Notiz speichern
            </button>
          </div>
        ) : null}

        {eventStatus && (
          <StatusAlert className="mt-3">{eventStatus}</StatusAlert>
        )}

        {actionError && (
          <ErrorAlert className="mt-3">{actionError}</ErrorAlert>
        )}
      </MobileMapFloatingCard>
    </div>
  )
}
