import { useLivePositionMapAssignmentController } from '@/components/maps/hooks/use-live-position-map-assignment-controller'
import { useLivePositionMapEditController } from '@/components/maps/hooks/use-live-position-map-edit-controller'
import type { LivePositionMapState } from '@/components/maps/hooks/use-live-position-map-state'
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
  selection: LivePositionMapState['selection']
  edit: LivePositionMapState['edit']
  assignment: LivePositionMapState['assignment']
}

export function useLivePositionMapEnclosureController({
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
}: UseLivePositionMapEnclosureControllerOptions) {
  function clearSelectedEnclosure() {
    selection.setSelectedEnclosureId(null)
    selection.setShowSelectedTrack(false)
    selection.setIsSelectedEnclosureInfoOpen(false)
  }

  function toggleSelectedTrackForEnclosure(enclosureId: string) {
    selection.setShowSelectedTrack((current) =>
      selection.selectedEnclosureId === enclosureId ? !current : true
    )
  }

  const editController = useLivePositionMapEditController({
    safeEnclosures,
    editAreaM2,
    selectedEnclosureId: selection.selectedEnclosureId,
    editingEnclosureId: edit.editingEnclosureId,
    editName: edit.editName,
    editNotes: edit.editNotes,
    editGeometryPoints: edit.editGeometryPoints,
    selectedEditPointIndex: edit.selectedEditPointIndex,
    setSelectedEnclosureId: selection.setSelectedEnclosureId,
    setShowSelectedTrack: selection.setShowSelectedTrack,
    setEditingEnclosureId: edit.setEditingEnclosureId,
    setEditName: edit.setEditName,
    setEditNotes: edit.setEditNotes,
    setEditError: edit.setEditError,
    setIsEditing: edit.setIsEditing,
    setEditGeometryPoints: edit.setEditGeometryPoints,
    setSelectedEditPointIndex: edit.setSelectedEditPointIndex,
    setIsAddingEditPoint: edit.setIsAddingEditPoint,
  })

  const assignmentController = useLivePositionMapAssignmentController({
    safeHerds,
    herdsById,
    animalsByHerdId,
    activeAssignmentsByEnclosureId,
    activeAssignmentsByHerdId,
    assignmentHerdId: assignment.assignmentHerdId,
    assignmentCount: assignment.assignmentCount,
    assignmentNotes: assignment.assignmentNotes,
    setSelectedEnclosureId: selection.setSelectedEnclosureId,
    setAssignmentEditorEnclosureId: assignment.setAssignmentEditorEnclosureId,
    setAssignmentHerdId: assignment.setAssignmentHerdId,
    setAssignmentCount: assignment.setAssignmentCount,
    setAssignmentNotes: assignment.setAssignmentNotes,
    setAssignmentError: assignment.setAssignmentError,
    setIsAssignmentSaving: assignment.setIsAssignmentSaving,
    setEndingAssignmentId: assignment.setEndingAssignmentId,
  })

  return {
    clearSelectedEnclosure,
    toggleSelectedTrackForEnclosure,
    ...editController,
    ...assignmentController,
  }
}
