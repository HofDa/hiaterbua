import { useEffect, useRef } from 'react'
import type { Dispatch, FormEvent, MutableRefObject, SetStateAction } from 'react'
import {
  appendWalkTrackpoint,
  discardWalkTrack,
  removeWalkTrackpointAtIndex,
  saveWalkEnclosureRecord,
} from '@/lib/maps/live-position-actions'
import { useLatestValueRef } from '@/components/maps/hooks/use-latest-value-ref'
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
  const appendWalkPointRef = useRef<(nextPosition: PositionData) => Promise<void>>(async () => {})

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
    })

    if (!result) {
      return
    }

    walkSeqRef.current = result.nextSeq
    walkLastTimestampRef.current = result.lastTimestamp

    let nextPoints: PositionData[] = []
    setWalkPoints((currentPoints) => {
      nextPoints = [...currentPoints, nextPosition]
      return nextPoints
    })
    focusWalkPoints(nextPoints)
  }

  appendWalkPointRef.current = appendWalkPoint

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

    if (acceptedPositionRef.current) {
      await appendWalkPoint(acceptedPositionRef.current)
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

    setIsWalkSaving(true)
    setWalkError('')

    try {
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
    } catch {
      setWalkError('Abgelaufener Pferch konnte nicht gespeichert werden.')
    } finally {
      setIsWalkSaving(false)
    }
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
