import { useEffect } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { useLivePositionMapDrawWalkController } from '@/components/maps/hooks/use-live-position-map-draw-walk-controller'
import { useLivePositionMapEnclosureController } from '@/components/maps/hooks/use-live-position-map-enclosure-controller'
import type { MobilePanel, PositionData } from '@/components/maps/live-position-map-types'
import type {
  Animal,
  Enclosure,
  EnclosureAssignment,
  Herd,
} from '@/types/domain'
import type { DraftPoint } from '@/lib/maps/live-position-map-helpers'

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
  draftPoints: DraftPoint[]
  isDrawing: boolean
  name: string
  notes: string
  walkPoints: PositionData[]
  isWalking: boolean
  walkName: string
  walkNotes: string
  selectedWalkPointIndex: number | null
  selectedEnclosureId: string | null
  editingEnclosureId: string | null
  editName: string
  editNotes: string
  editGeometryPoints: DraftPoint[]
  selectedEditPointIndex: number | null
  assignmentHerdId: string
  assignmentCount: string
  assignmentNotes: string
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
  setEditName: Dispatch<SetStateAction<string>>
  setEditNotes: Dispatch<SetStateAction<string>>
  setEditError: Dispatch<SetStateAction<string>>
  setIsEditing: Dispatch<SetStateAction<boolean>>
  setEditGeometryPoints: Dispatch<SetStateAction<DraftPoint[]>>
  setSelectedEditPointIndex: Dispatch<SetStateAction<number | null>>
  setIsAddingEditPoint: Dispatch<SetStateAction<boolean>>
  setMobilePanel: Dispatch<SetStateAction<MobilePanel>>
  setAssignmentEditorEnclosureId: Dispatch<SetStateAction<string | null>>
  setAssignmentHerdId: Dispatch<SetStateAction<string>>
  setAssignmentCount: Dispatch<SetStateAction<string>>
  setAssignmentNotes: Dispatch<SetStateAction<string>>
  setAssignmentError: Dispatch<SetStateAction<string>>
  setIsAssignmentSaving: Dispatch<SetStateAction<boolean>>
  setEndingAssignmentId: Dispatch<SetStateAction<string | null>>
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
  draftPoints,
  isDrawing,
  name,
  notes,
  walkPoints,
  isWalking,
  walkName,
  walkNotes,
  selectedWalkPointIndex,
  selectedEnclosureId,
  editingEnclosureId,
  editName,
  editNotes,
  editGeometryPoints,
  selectedEditPointIndex,
  assignmentHerdId,
  assignmentCount,
  assignmentNotes,
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
  setEditName,
  setEditNotes,
  setEditError,
  setIsEditing,
  setEditGeometryPoints,
  setSelectedEditPointIndex,
  setIsAddingEditPoint,
  setMobilePanel,
  setAssignmentEditorEnclosureId,
  setAssignmentHerdId,
  setAssignmentCount,
  setAssignmentNotes,
  setAssignmentError,
  setIsAssignmentSaving,
  setEndingAssignmentId,
  focusEnclosure,
  focusWalkPoints,
}: UseLivePositionMapControllerOptions) {
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
  })

  const enclosureController = useLivePositionMapEnclosureController({
    safeEnclosures,
    safeHerds,
    herdsById,
    animalsByHerdId,
    activeAssignmentsByEnclosureId,
    activeAssignmentsByHerdId,
    editAreaM2,
    selectedEnclosureId,
    editingEnclosureId,
    editName,
    editNotes,
    editGeometryPoints,
    selectedEditPointIndex,
    assignmentHerdId,
    assignmentCount,
    assignmentNotes,
    setSelectedEnclosureId,
    setShowSelectedTrack,
    setIsSelectedEnclosureInfoOpen,
    setEditingEnclosureId,
    setEditName,
    setEditNotes,
    setEditError,
    setIsEditing,
    setEditGeometryPoints,
    setSelectedEditPointIndex,
    setIsAddingEditPoint,
    setAssignmentEditorEnclosureId,
    setAssignmentHerdId,
    setAssignmentCount,
    setAssignmentNotes,
    setAssignmentError,
    setIsAssignmentSaving,
    setEndingAssignmentId,
  })

  return {
    ...drawWalkController,
    ...enclosureController,
  }
}
