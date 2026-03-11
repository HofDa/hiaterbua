import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { useLivePositionMapDrawController } from '@/components/maps/hooks/use-live-position-map-draw-controller'
import { useLivePositionMapWalkController } from '@/components/maps/hooks/use-live-position-map-walk-controller'
import type { PositionData } from '@/components/maps/live-position-map-types'
import type { DraftPoint } from '@/lib/maps/live-position-map-helpers'
import type { Enclosure } from '@/types/domain'

type UseLivePositionMapDrawWalkControllerOptions = {
  acceptedPositionRef: MutableRefObject<PositionData | null>
  positionAccuracy: number | null
  draftAreaM2: number
  walkAreaM2: number
  draftPoints: DraftPoint[]
  name: string
  notes: string
  walkPoints: PositionData[]
  isWalking: boolean
  walkName: string
  walkNotes: string
  selectedWalkPointIndex: number | null
  setDraftPoints: Dispatch<SetStateAction<DraftPoint[]>>
  setIsDrawing: Dispatch<SetStateAction<boolean>>
  setName: Dispatch<SetStateAction<string>>
  setNotes: Dispatch<SetStateAction<string>>
  setSaveError: Dispatch<SetStateAction<string>>
  setIsSaving: Dispatch<SetStateAction<boolean>>
  setWalkPoints: Dispatch<SetStateAction<PositionData[]>>
  setIsWalking: Dispatch<SetStateAction<boolean>>
  setWalkName: Dispatch<SetStateAction<string>>
  setWalkNotes: Dispatch<SetStateAction<string>>
  setWalkError: Dispatch<SetStateAction<string>>
  setIsWalkSaving: Dispatch<SetStateAction<boolean>>
  setSelectedWalkPointIndex: Dispatch<SetStateAction<number | null>>
  setSelectedEnclosureId: Dispatch<SetStateAction<string | null>>
  setShowSelectedTrack: Dispatch<SetStateAction<boolean>>
  setIsSelectedEnclosureInfoOpen: Dispatch<SetStateAction<boolean>>
  setEditingEnclosureId: Dispatch<SetStateAction<string | null>>
  setAssignmentEditorEnclosureId: Dispatch<SetStateAction<string | null>>
  focusEnclosure: (enclosure: Enclosure) => void
  focusWalkPoints: (points: PositionData[]) => void
}

export function useLivePositionMapDrawWalkController({
  acceptedPositionRef,
  positionAccuracy,
  draftAreaM2,
  walkAreaM2,
  draftPoints,
  name,
  notes,
  walkPoints,
  isWalking,
  walkName,
  walkNotes,
  selectedWalkPointIndex,
  setDraftPoints,
  setIsDrawing,
  setName,
  setNotes,
  setSaveError,
  setIsSaving,
  setWalkPoints,
  setIsWalking,
  setWalkName,
  setWalkNotes,
  setWalkError,
  setIsWalkSaving,
  setSelectedWalkPointIndex,
  setSelectedEnclosureId,
  setShowSelectedTrack,
  setIsSelectedEnclosureInfoOpen,
  setEditingEnclosureId,
  setAssignmentEditorEnclosureId,
  focusEnclosure,
  focusWalkPoints,
}: UseLivePositionMapDrawWalkControllerOptions) {
  const drawController = useLivePositionMapDrawController({
    positionAccuracy,
    draftAreaM2,
    draftPoints,
    name,
    notes,
    setDraftPoints,
    setIsDrawing,
    setName,
    setNotes,
    setSaveError,
    setIsSaving,
    setSelectedEnclosureId,
    setShowSelectedTrack,
    setIsSelectedEnclosureInfoOpen,
    setEditingEnclosureId,
    setAssignmentEditorEnclosureId,
    focusEnclosure,
  })

  const walkController = useLivePositionMapWalkController({
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
  })

  return {
    ...drawController,
    ...walkController,
  }
}
