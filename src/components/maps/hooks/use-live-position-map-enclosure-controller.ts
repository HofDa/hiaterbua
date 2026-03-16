import type { Dispatch, SetStateAction } from 'react'
import type { DraftPoint } from '@/lib/maps/live-position-map-helpers'
import { useLivePositionMapAssignmentController } from '@/components/maps/hooks/use-live-position-map-assignment-controller'
import { useLivePositionMapEditController } from '@/components/maps/hooks/use-live-position-map-edit-controller'
import type {
  Animal,
  Enclosure,
  EnclosureAssignment,
  Herd,
} from '@/types/domain'

type UseLivePositionMapEnclosureControllerOptions = {
  safeEnclosures: Enclosure[]
  safeHerds: Herd[]
  herdsById: Map<string, Herd>
  animalsByHerdId: Map<string, Animal[]>
  activeAssignmentsByEnclosureId: Map<string, EnclosureAssignment>
  activeAssignmentsByHerdId: Map<string, EnclosureAssignment>
  editAreaM2: number
  selectedEnclosureId: string | null
  editingEnclosureId: string | null
  editName: string
  editNotes: string
  editGeometryPoints: DraftPoint[]
  selectedEditPointIndex: number | null
  assignmentHerdId: string
  assignmentCount: string
  assignmentNotes: string
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
  setAssignmentEditorEnclosureId: Dispatch<SetStateAction<string | null>>
  setAssignmentHerdId: Dispatch<SetStateAction<string>>
  setAssignmentCount: Dispatch<SetStateAction<string>>
  setAssignmentNotes: Dispatch<SetStateAction<string>>
  setAssignmentError: Dispatch<SetStateAction<string>>
  setIsAssignmentSaving: Dispatch<SetStateAction<boolean>>
  setEndingAssignmentId: Dispatch<SetStateAction<string | null>>
}

export function useLivePositionMapEnclosureController({
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
}: UseLivePositionMapEnclosureControllerOptions) {
  function clearSelectedEnclosure() {
    setSelectedEnclosureId(null)
    setShowSelectedTrack(false)
    setIsSelectedEnclosureInfoOpen(false)
  }

  function toggleSelectedTrackForEnclosure(enclosureId: string) {
    setShowSelectedTrack((current) =>
      selectedEnclosureId === enclosureId ? !current : true
    )
  }

  const editController = useLivePositionMapEditController({
    safeEnclosures,
    editAreaM2,
    selectedEnclosureId,
    editingEnclosureId,
    editName,
    editNotes,
    editGeometryPoints,
    selectedEditPointIndex,
    setSelectedEnclosureId,
    setShowSelectedTrack,
    setEditingEnclosureId,
    setEditName,
    setEditNotes,
    setEditError,
    setIsEditing,
    setEditGeometryPoints,
    setSelectedEditPointIndex,
    setIsAddingEditPoint,
  })

  const assignmentController = useLivePositionMapAssignmentController({
    safeHerds,
    herdsById,
    animalsByHerdId,
    activeAssignmentsByEnclosureId,
    activeAssignmentsByHerdId,
    assignmentHerdId,
    assignmentCount,
    assignmentNotes,
    setSelectedEnclosureId,
    setAssignmentEditorEnclosureId,
    setAssignmentHerdId,
    setAssignmentCount,
    setAssignmentNotes,
    setAssignmentError,
    setIsAssignmentSaving,
    setEndingAssignmentId,
  })

  return {
    clearSelectedEnclosure,
    toggleSelectedTrackForEnclosure,
    ...editController,
    ...assignmentController,
  }
}
