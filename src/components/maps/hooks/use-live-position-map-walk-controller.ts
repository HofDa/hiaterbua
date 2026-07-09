import { useEffect, useRef } from 'react'
import type { Dispatch, FormEvent, MutableRefObject, SetStateAction } from 'react'
import { runSavingAction } from '@/components/maps/hooks/run-saving-action'
import {
  appendWalkTrackpoint,
  discardWalkTrack,
  removeWalkTrackpointAtIndex,
} from '@/lib/maps/live-position-actions'
import { saveWalkEnclosureRecord } from '@/lib/db/repositories/enclosures'
import { useLatestValueRef } from '@/components/maps/hooks/use-latest-value-ref'
import { getFreshPosition } from '@/lib/maps/map-core'
import { recordFieldDiagnostic } from '@/lib/diagnostics/field-diagnostics'
import { isQuotaExceededError } from '@/lib/utils/storage-health'
import type { PositionData } from '@/components/maps/live-position-map-types'
import { createId } from '@/lib/utils/ids'

type UseLivePositionMapWalkControllerOptions = {
  acceptedPositionRef: MutableRefObject<PositionData | null>
  walkAreaM2: number
  walkPoints: PositionData[]
  isWalking: boolean
  walkName: string
  walkNotes: string
  selectedWalkPointIndex: number | null
  setWalkPoints: Dispatch<SetStateAction<PositionData[]>>
  setIsWalking: Dispatch<SetStateAction<boolean>>
  setWalkName: Dispatch<SetStateAction<string>>
  setWalkNotes: Dispatch<SetStateAction<string>>
  setWalkError: Dispatch<SetStateAction<string>>
  setIsWalkSaving: Dispatch<SetStateAction<boolean>>
  setSelectedWalkPointIndex: Dispatch<SetStateAction<number | null>>
  setSelectedEnclosureId: Dispatch<SetStateAction<string | null>>
  setEditingEnclosureId: Dispatch<SetStateAction<string | null>>
  focusWalkPoints: (points: PositionData[]) => void
}

function buildWalkRecordingErrorMessage(error: unknown) {
  if (isQuotaExceededError(error)) {
    return 'Speicher voll – GPS-Punkte können nicht gespeichert werden. Bitte Speicher freigeben (z. B. Tile-Cache leeren).'
  }

  return 'GPS-Punkt konnte nicht gespeichert werden. Der nächste akzeptierte Standort wird erneut versucht.'
}

export function useLivePositionMapWalkController({
  acceptedPositionRef,
  walkAreaM2,
  walkPoints,
  isWalking,
  walkName,
  walkNotes,
  selectedWalkPointIndex,
  setWalkPoints,
  setIsWalking,
  setWalkName,
  setWalkNotes,
  setWalkError,
  setIsWalkSaving,
  setSelectedWalkPointIndex,
  setSelectedEnclosureId,
  setEditingEnclosureId,
  focusWalkPoints,
}: UseLivePositionMapWalkControllerOptions) {
  const isWalkingRef = useRef(false)
  const walkEnclosureIdRef = useRef<string | null>(null)
  const walkSeqRef = useRef(0)
  const walkLastTimestampRef = useRef<number | null>(null)

  useEffect(() => {
    if (selectedWalkPointIndex === null) return
    if (selectedWalkPointIndex < walkPoints.length) return
    setSelectedWalkPointIndex(null)
  }, [selectedWalkPointIndex, setSelectedWalkPointIndex, walkPoints])

  async function appendWalkPoint(nextPosition: PositionData) {
    const enclosureWalkId = walkEnclosureIdRef.current
    if (!enclosureWalkId) return

    const result = await appendWalkTrackpoint({
      enclosureWalkId,
      lastTimestamp: walkLastTimestampRef.current,
      nextSeq: walkSeqRef.current + 1,
      nextPosition,
    }).catch((error) => {
      recordFieldDiagnostic({
        type: 'indexeddb_write_failed',
        level: 'error',
        message: 'GPS-Walk-Punkt konnte lokal nicht gespeichert werden.',
        activeRecordingId: enclosureWalkId,
        details: error,
      })
      setWalkError(buildWalkRecordingErrorMessage(error))
      return null
    })

    if (!result) {
      return
    }

    walkSeqRef.current = result.nextSeq
    walkLastTimestampRef.current = result.lastTimestamp
    setWalkError('')

    let nextPoints: PositionData[] = []
    setWalkPoints((currentPoints) => {
      nextPoints = [...currentPoints, nextPosition]
      return nextPoints
    })
    focusWalkPoints(nextPoints)
  }

  const appendWalkPointRef = useLatestValueRef(appendWalkPoint)

  const handleAcceptedPositionRef = useLatestValueRef<((next: PositionData) => void) | null>(
    (next) => {
      if (isWalkingRef.current) {
        void appendWalkPointRef.current(next)
      }
    }
  )

  async function startWalkMode() {
    const enclosureId = createId('enclosure')

    isWalkingRef.current = true
    walkEnclosureIdRef.current = enclosureId
    walkSeqRef.current = 0
    walkLastTimestampRef.current = null

    setWalkPoints([])
    setWalkError('')
    setIsWalking(true)
    setSelectedWalkPointIndex(null)
    setSelectedEnclosureId(null)
    setEditingEnclosureId(null)
    recordFieldDiagnostic({
      type: 'gps_recording_started',
      message: 'GPS-Ablaufen gestartet.',
      activeRecordingId: enclosureId,
      details: { hasInitialPosition: Boolean(getFreshPosition(acceptedPositionRef.current)) },
    })

    const currentPosition = getFreshPosition(acceptedPositionRef.current)
    if (currentPosition) {
      await appendWalkPoint(currentPosition)
    }
  }

  function stopWalkMode() {
    if (walkPoints.length < 3) {
      setWalkError('Mindestens drei akzeptierte GPS-Punkte sind für einen Pferch nötig.')
      return
    }

    isWalkingRef.current = false
    setIsWalking(false)
    setWalkError('')
    recordFieldDiagnostic({
      type: 'gps_recording_stopped',
      message: 'GPS-Ablaufen gestoppt.',
      activeRecordingId: walkEnclosureIdRef.current,
      details: { pointCount: walkPoints.length },
    })
  }

  async function discardWalkMode() {
    const enclosureWalkId = walkEnclosureIdRef.current

    isWalkingRef.current = false
    setIsWalking(false)
    setWalkPoints([])
    setWalkError('')
    setWalkName('')
    setWalkNotes('')
    setSelectedWalkPointIndex(null)
    walkSeqRef.current = 0
    walkLastTimestampRef.current = null
    walkEnclosureIdRef.current = null

    await discardWalkTrack(enclosureWalkId)
    recordFieldDiagnostic({
      type: 'gps_recording_stopped',
      level: 'warning',
      message: 'GPS-Ablaufen verworfen.',
      activeRecordingId: enclosureWalkId,
    })
  }

  async function removeWalkPointAtIndex(pointIndex: number) {
    const enclosureWalkId = walkEnclosureIdRef.current
    if (!enclosureWalkId || walkPoints.length === 0) return
    const result = await removeWalkTrackpointAtIndex({
      enclosureWalkId,
      walkPoints,
      pointIndex,
    })

    if (!result) {
      return
    }

    setWalkPoints(result.nextPoints)
    walkSeqRef.current = result.nextSeq
    walkLastTimestampRef.current = result.lastTimestamp
    focusWalkPoints(result.nextPoints)
    setSelectedWalkPointIndex((currentIndex) => {
      if (currentIndex === null) return null
      if (currentIndex === pointIndex) return null
      if (currentIndex > pointIndex) return currentIndex - 1
      return currentIndex
    })

    setWalkError(result.message)
  }

  async function undoLastWalkPoint() {
    await removeWalkPointAtIndex(walkPoints.length - 1)
  }

  async function saveWalkEnclosure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const enclosureId = walkEnclosureIdRef.current
    const cleanedName = walkName.trim()

    if (!enclosureId) {
      setWalkError('Kein aktiver Ablauf vorhanden.')
      return
    }

    if (isWalking) {
      setWalkError('Ablaufen zuerst beenden, dann speichern.')
      return
    }

    if (!cleanedName) {
      setWalkError('Bitte einen Namen für den abgelaufenen Pferch vergeben.')
      return
    }

    if (walkPoints.length < 3) {
      setWalkError('Es fehlen noch genug akzeptierte GPS-Punkte.')
      return
    }

    await runSavingAction({
      setSaving: setIsWalkSaving,
      savingValue: true,
      idleValue: false,
      setError: setWalkError,
      errorMessage: 'Abgelaufener Pferch konnte nicht gespeichert werden.',
      action: async () => {
        const enclosure = await saveWalkEnclosureRecord({
          enclosureId,
          name: cleanedName,
          notes: walkNotes,
          walkPoints,
          walkAreaM2,
        })

        setSelectedEnclosureId(enclosure.id)
        setWalkPoints([])
        setWalkName('')
        setWalkNotes('')
        setSelectedWalkPointIndex(null)
        setIsWalking(false)
        isWalkingRef.current = false
        walkEnclosureIdRef.current = null
        walkSeqRef.current = 0
        walkLastTimestampRef.current = null
      },
    })
  }

  return {
    handleAcceptedPositionRef,
    startWalkMode,
    stopWalkMode,
    discardWalkMode,
    removeWalkPointAtIndex,
    undoLastWalkPoint,
    saveWalkEnclosure,
  }
}
