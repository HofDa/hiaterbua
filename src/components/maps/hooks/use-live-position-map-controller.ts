import { useEffect } from 'react'
import type { MutableRefObject } from 'react'
import { useLivePositionMapDrawWalkController } from '@/components/maps/hooks/use-live-position-map-draw-walk-controller'
import { useLivePositionMapEnclosureController } from '@/components/maps/hooks/use-live-position-map-enclosure-controller'
import { useTransientFieldOperation } from '@/lib/field-safety/field-safety-store'
import type { LivePositionMapState } from '@/components/maps/hooks/use-live-position-map-state'
import type { PositionData } from '@/components/maps/live-position-map-types'
import type {
  Animal,
  Enclosure,
  EnclosureAssignment,
  Herd,
} from '@/types/domain'

type UseLivePositionMapControllerOptions = {
  safeEnclosures: Enclosure[]
  safeHerds: Herd[]
  herdsById: Map<string, Herd>
  animalsByHerdId: Map<string, Animal[]>
  activeAssignmentsByEnclosureId: Map<string, EnclosureAssignment>
  activeAssignmentsByHerdId: Map<string, EnclosureAssignment>
  acceptedPositionRef: MutableRefObject<PositionData | null>
  positionAccuracy: number | null
  draftAreaM2: number
  editAreaM2: number
  walkAreaM2: number
  draw: LivePositionMapState['draw']
  walk: LivePositionMapState['walk']
  selection: LivePositionMapState['selection']
  edit: LivePositionMapState['edit']
  assignment: LivePositionMapState['assignment']
  focusEnclosure: (enclosure: Enclosure) => void
  focusWalkPoints: (points: PositionData[]) => void
}

export function useLivePositionMapController({
  safeEnclosures,
  safeHerds,
  herdsById,
  animalsByHerdId,
  activeAssignmentsByEnclosureId,
  activeAssignmentsByHerdId,
  acceptedPositionRef,
  positionAccuracy,
  draftAreaM2,
  editAreaM2,
  walkAreaM2,
  draw,
  walk,
  selection,
  edit,
  assignment,
  focusEnclosure,
  focusWalkPoints,
}: UseLivePositionMapControllerOptions) {
  const { draftPoints, isDrawing } = draw
  const { isWalking, walkPoints } = walk
  const { selectedEnclosureId, setMobilePanel } = selection
  const { editingEnclosureId } = edit

  useTransientFieldOperation('live-position-walk-recording', 'gps-recording', isWalking)

  useEffect(() => {
    if (editingEnclosureId || selectedEnclosureId) {
      setMobilePanel('saved')
      return
    }

    if (isWalking || walkPoints.length > 0) {
      setMobilePanel('walk')
      return
    }

    if (isDrawing || draftPoints.length > 0) {
      setMobilePanel('draw')
    }
  }, [
    draftPoints.length,
    editingEnclosureId,
    isDrawing,
    isWalking,
    selectedEnclosureId,
    setMobilePanel,
    walkPoints.length,
  ])

  const drawWalkController = useLivePositionMapDrawWalkController({
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
  })

  const enclosureController = useLivePositionMapEnclosureController({
    safeEnclosures,
    safeHerds,
    herdsById,
    animalsByHerdId,
    activeAssignmentsByEnclosureId,
    activeAssignmentsByHerdId,
    editAreaM2,
    selection,
    edit,
    assignment,
  })

  return {
    ...drawWalkController,
    ...enclosureController,
  }
}
