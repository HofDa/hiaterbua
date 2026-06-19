import { useEffect } from 'react'
import {
  deleteGrazingSessionRecord,
  saveEditedGrazingSessionRecord,
} from '@/lib/db/repositories/sessions'
import { runSavingAction } from '@/components/maps/hooks/run-saving-action'
import {
  formatDateTimeInputValue,
  formatDateTime,
  parseDateTimeInputValue,
} from '@/lib/maps/grazing-session-map-helpers'
import type { GrazingSessionMapState } from '@/components/maps/hooks/use-grazing-session-map-state'
import type {
  GrazingSession,
  TrackPoint,
} from '@/types/domain'

type UseGrazingSessionMapHistoryEditControllerOptions = {
  activeSession: GrazingSession | null
  selectedSession: GrazingSession | null
  groupedSessionHistory: Array<{ dayKey: string }>
  safeSelectedTrackpoints: TrackPoint[]
  selection: GrazingSessionMapState['selection']
  session: GrazingSessionMapState['session']
  edit: GrazingSessionMapState['edit']
  history: GrazingSessionMapState['history']
}

export function useGrazingSessionMapHistoryEditController({
  activeSession,
  selectedSession,
  groupedSessionHistory,
  safeSelectedTrackpoints,
  selection,
  session,
  edit,
  history,
}: UseGrazingSessionMapHistoryEditControllerOptions) {
  const { selectedSessionId, setSelectedSessionId } = selection
  const { setActionError, setIsSaving } = session
  const {
    editingSessionId,
    editTrackpoints,
    editStartTime,
    editEndTime,
    selectedEditTrackpointIndex,
    setEditingSessionId,
    setEditTrackpoints,
    setEditStartTime,
    setEditEndTime,
    setSelectedEditTrackpointIndex,
    setIsAddingEditTrackpoint,
  } = edit
  const { setExpandedHistoryDays, setExpandedHistorySessionId } = history

  useEffect(() => {
    if (groupedSessionHistory.length === 0) {
      setExpandedHistoryDays([])
      return
    }

    setExpandedHistoryDays((current) =>
      current.length > 0 ? current : [groupedSessionHistory[0].dayKey]
    )
  }, [groupedSessionHistory, setExpandedHistoryDays])

  useEffect(() => {
    if (!editingSessionId || editingSessionId !== selectedSessionId) {
      setEditTrackpoints([])
      setEditStartTime('')
      setEditEndTime('')
      setSelectedEditTrackpointIndex(null)
      setIsAddingEditTrackpoint(false)
      return
    }

    if (!selectedSession) {
      return
    }

    setEditTrackpoints(
      safeSelectedTrackpoints.map((point) => ({
        lat: point.lat,
        lon: point.lon,
        timestamp: point.timestamp,
        accuracyM: point.accuracyM ?? null,
        speedMps: point.speedMps ?? null,
        headingDeg: point.headingDeg ?? null,
      }))
    )
    setEditStartTime(formatDateTimeInputValue(selectedSession.startTime))
    setEditEndTime(formatDateTimeInputValue(selectedSession.endTime))
    setSelectedEditTrackpointIndex(null)
    setIsAddingEditTrackpoint(false)
  }, [
    editingSessionId,
    safeSelectedTrackpoints,
    selectedSession,
    selectedSessionId,
    setEditTrackpoints,
    setEditStartTime,
    setEditEndTime,
    setIsAddingEditTrackpoint,
    setSelectedEditTrackpointIndex,
  ])

  function toggleHistoryDay(dayKey: string) {
    setExpandedHistoryDays((current) =>
      current.includes(dayKey)
        ? current.filter((currentDayKey) => currentDayKey !== dayKey)
        : [...current, dayKey]
    )
  }

  function toggleExpandedHistorySession(sessionId: string) {
    setExpandedHistorySessionId((current) => (current === sessionId ? null : sessionId))
  }

  function startEditSession(sessionId: string) {
    setSelectedSessionId(sessionId)
    setEditingSessionId(sessionId)
    setActionError('')
  }

  function cancelEditSession() {
    setEditingSessionId(null)
    setEditStartTime('')
    setEditEndTime('')
    setSelectedEditTrackpointIndex(null)
    setIsAddingEditTrackpoint(false)
    setActionError('')
  }

  function startAddEditTrackpoint() {
    setIsAddingEditTrackpoint(true)
    setSelectedEditTrackpointIndex(null)
    setActionError('')
  }

  function removeSelectedEditTrackpoint() {
    if (selectedEditTrackpointIndex === null) return
    if (editTrackpoints.length <= 1) {
      setActionError('Ein Weidegang braucht mindestens einen Trackpunkt.')
      return
    }

    setEditTrackpoints((currentPoints) =>
      currentPoints.filter((_, index) => index !== selectedEditTrackpointIndex)
    )
    setSelectedEditTrackpointIndex(null)
    setIsAddingEditTrackpoint(false)
    setActionError('')
  }

  async function saveEditedSession() {
    if (!editingSessionId || !selectedSession) return
    if (editTrackpoints.length === 0) {
      setActionError('Es gibt keine Trackpunkte zum Speichern.')
      return
    }

    let nextStartTime = selectedSession.startTime
    let nextEndTime = selectedSession.endTime ?? null

    if (selectedSession.status === 'finished') {
      const parsedStartTime = parseDateTimeInputValue(editStartTime)
      const parsedEndTime = parseDateTimeInputValue(editEndTime)

      if (!parsedStartTime) {
        setActionError('Bitte einen gueltigen Beginn angeben.')
        return
      }

      if (!parsedEndTime) {
        setActionError('Bitte ein gueltiges Ende angeben.')
        return
      }

      if (new Date(parsedEndTime).getTime() < new Date(parsedStartTime).getTime()) {
        setActionError('Das Ende muss nach dem Beginn liegen.')
        return
      }

      nextStartTime = parsedStartTime
      nextEndTime = parsedEndTime
    }

    await runSavingAction({
      setSaving: setIsSaving,
      savingValue: true,
      idleValue: false,
      setError: setActionError,
      errorMessage: 'Weidegang konnte nicht aktualisiert werden.',
      action: async () => {
        await saveEditedGrazingSessionRecord({
          sessionId: editingSessionId,
          editTrackpoints,
          editedStartTime: nextStartTime,
          editedEndTime: nextEndTime,
          existingTrackpoints: safeSelectedTrackpoints,
        })

        setEditingSessionId(null)
        setEditStartTime('')
        setEditEndTime('')
        setSelectedEditTrackpointIndex(null)
        setIsAddingEditTrackpoint(false)
      },
    })
  }

  async function deleteSession(session: GrazingSession) {
    if (
      activeSession?.id === session.id ||
      session.status === 'active' ||
      session.status === 'paused'
    ) {
      setActionError('Laufende oder pausierte Weidegänge können nicht gelöscht werden.')
      return
    }

    const confirmed = window.confirm(
      `Weidegang vom ${formatDateTime(session.startTime)} wirklich löschen?`
    )

    if (!confirmed) return

    await runSavingAction({
      setSaving: setIsSaving,
      savingValue: true,
      idleValue: false,
      setError: setActionError,
      errorMessage: 'Weidegang konnte nicht gelöscht werden.',
      action: async () => {
        await deleteGrazingSessionRecord(session.id)

        if (selectedSessionId === session.id) {
          setSelectedSessionId(null)
        }

        if (editingSessionId === session.id) {
          cancelEditSession()
        }
      },
    })
  }

  return {
    toggleHistoryDay,
    toggleExpandedHistorySession,
    startEditSession,
    cancelEditSession,
    startAddEditTrackpoint,
    removeSelectedEditTrackpoint,
    saveEditedSession,
    deleteSession,
  }
}
