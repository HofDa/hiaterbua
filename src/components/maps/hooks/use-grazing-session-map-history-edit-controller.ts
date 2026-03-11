import { useEffect } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import {
  deleteGrazingSessionRecord,
  saveEditedGrazingSessionRecord,
} from '@/lib/maps/grazing-session-actions'
import {
  formatDateTimeInputValue,
  formatDateTime,
  parseDateTimeInputValue,
  type EditableTrackPoint,
} from '@/lib/maps/grazing-session-map-helpers'
import type {
  GrazingSession,
  TrackPoint,
} from '@/types/domain'

type UseGrazingSessionMapHistoryEditControllerOptions = {
  activeSession: GrazingSession | null
  selectedSession: GrazingSession | null
  groupedSessionHistory: Array<{ dayKey: string }>
  safeSelectedTrackpoints: TrackPoint[]
  selectedSessionId: string | null
  editingSessionId: string | null
  editTrackpoints: EditableTrackPoint[]
  editStartTime: string
  editEndTime: string
  selectedEditTrackpointIndex: number | null
  setSelectedSessionId: Dispatch<SetStateAction<string | null>>
  setEditingSessionId: Dispatch<SetStateAction<string | null>>
  setEditTrackpoints: Dispatch<SetStateAction<EditableTrackPoint[]>>
  setEditStartTime: Dispatch<SetStateAction<string>>
  setEditEndTime: Dispatch<SetStateAction<string>>
  setSelectedEditTrackpointIndex: Dispatch<SetStateAction<number | null>>
  setIsAddingEditTrackpoint: Dispatch<SetStateAction<boolean>>
  setActionError: Dispatch<SetStateAction<string>>
  setIsSaving: Dispatch<SetStateAction<boolean>>
  setExpandedHistoryDays: Dispatch<SetStateAction<string[]>>
  setExpandedHistorySessionId: Dispatch<SetStateAction<string | null>>
}

export function useGrazingSessionMapHistoryEditController({
  activeSession,
  selectedSession,
  groupedSessionHistory,
  safeSelectedTrackpoints,
  selectedSessionId,
  editingSessionId,
  editTrackpoints,
  editStartTime,
  editEndTime,
  selectedEditTrackpointIndex,
  setSelectedSessionId,
  setEditingSessionId,
  setEditTrackpoints,
  setEditStartTime,
  setEditEndTime,
  setSelectedEditTrackpointIndex,
  setIsAddingEditTrackpoint,
  setActionError,
  setIsSaving,
  setExpandedHistoryDays,
  setExpandedHistorySessionId,
}: UseGrazingSessionMapHistoryEditControllerOptions) {
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

    setIsSaving(true)
    setActionError('')

    try {
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
    } catch {
      setActionError('Weidegang konnte nicht aktualisiert werden.')
    } finally {
      setIsSaving(false)
    }
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

    setIsSaving(true)
    setActionError('')

    try {
      await deleteGrazingSessionRecord(session.id)

      if (selectedSessionId === session.id) {
        setSelectedSessionId(null)
      }

      if (editingSessionId === session.id) {
        cancelEditSession()
      }
    } catch {
      setActionError('Weidegang konnte nicht gelöscht werden.')
    } finally {
      setIsSaving(false)
    }
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
