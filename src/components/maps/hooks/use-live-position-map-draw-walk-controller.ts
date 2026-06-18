import type { MutableRefObject } from 'react'
import { useLivePositionMapDrawController } from '@/components/maps/hooks/use-live-position-map-draw-controller'
import { useLivePositionMapWalkController } from '@/components/maps/hooks/use-live-position-map-walk-controller'
import type { LivePositionMapState } from '@/components/maps/hooks/use-live-position-map-state'
import type { PositionData } from '@/components/maps/live-position-map-types'
import type { Enclosure } from '@/types/domain'

type UseLivePositionMapDrawWalkControllerOptions = {
  acceptedPositionRef: MutableRefObject<PositionData | null>
  positionAccuracy: number | null
  draftAreaM2: number
  walkAreaM2: number
  draw: LivePositionMapState['draw']
  walk: LivePositionMapState['walk']
  selection: LivePositionMapState['selection']
  edit: LivePositionMapState['edit']
  assignment: LivePositionMapState['assignment']
  focusEnclosure: (enclosure: Enclosure) => void
  focusWalkPoints: (points: PositionData[]) => void
}

export function useLivePositionMapDrawWalkController({
  acceptedPositionRef,
  positionAccuracy,
  draftAreaM2,
  walkAreaM2,
  draw,
  walk,
  selection,
  edit,
  assignment,
  focusEnclosure,
  focusWalkPoints,
}: UseLivePositionMapDrawWalkControllerOptions) {
  const drawController = useLivePositionMapDrawController({
    positionAccuracy,
    draftAreaM2,
    draftPoints: draw.draftPoints,
    name: draw.name,
    notes: draw.notes,
    setDraftPoints: draw.setDraftPoints,
    setIsDrawing: draw.setIsDrawing,
    setName: draw.setName,
    setNotes: draw.setNotes,
    setSaveError: draw.setSaveError,
    setIsSaving: draw.setIsSaving,
    setSelectedEnclosureId: selection.setSelectedEnclosureId,
    setShowSelectedTrack: selection.setShowSelectedTrack,
    setIsSelectedEnclosureInfoOpen: selection.setIsSelectedEnclosureInfoOpen,
    setEditingEnclosureId: edit.setEditingEnclosureId,
    setAssignmentEditorEnclosureId: assignment.setAssignmentEditorEnclosureId,
    focusEnclosure,
  })

  const walkController = useLivePositionMapWalkController({
    acceptedPositionRef,
    walkAreaM2,
    walkPoints: walk.walkPoints,
    isWalking: walk.isWalking,
    walkName: walk.walkName,
    walkNotes: walk.walkNotes,
    selectedWalkPointIndex: walk.selectedWalkPointIndex,
    setWalkPoints: walk.setWalkPoints,
    setIsWalking: walk.setIsWalking,
    setWalkName: walk.setWalkName,
    setWalkNotes: walk.setWalkNotes,
    setWalkError: walk.setWalkError,
    setIsWalkSaving: walk.setIsWalkSaving,
    setSelectedWalkPointIndex: walk.setSelectedWalkPointIndex,
    setSelectedEnclosureId: selection.setSelectedEnclosureId,
    setEditingEnclosureId: edit.setEditingEnclosureId,
    focusWalkPoints,
  })

  return {
    ...drawController,
    ...walkController,
  }
}
