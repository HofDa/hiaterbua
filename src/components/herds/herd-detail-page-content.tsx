'use client'

import { useMemo } from 'react'
import { speciesOptions } from '@/components/herds/animal-form-fields'
import { HerdDetailAddAnimalCard } from '@/components/herds/herd-detail-add-animal-card'
import { HerdDetailAnimalEditCard } from '@/components/herds/herd-detail-animal-edit-card'
import { HerdDetailAnimalList } from '@/components/herds/herd-detail-animal-list'
import { HerdDetailAssignmentCard } from '@/components/herds/herd-detail-assignment-card'
import { HerdDetailHeaderCard } from '@/components/herds/herd-detail-header-card'
import { useHerdDetailAnimalController } from '@/components/herds/hooks/use-herd-detail-animal-controller'
import { useHerdDetailAssignmentController } from '@/components/herds/hooks/use-herd-detail-assignment-controller'
import { useHerdDetailMetaController } from '@/components/herds/hooks/use-herd-detail-meta-controller'
import type {
  Animal,
  Enclosure,
  EnclosureAssignment,
  Herd,
} from '@/types/domain'

type HerdDetailPageContentProps = {
  herdId: string
  herd: Herd
  allAnimals: Animal[]
  animals: Animal[]
  enclosures: Enclosure[]
  assignments: EnclosureAssignment[]
  onBack: () => void
  onDeleted: () => void
}

export function HerdDetailPageContent({
  herdId,
  herd,
  allAnimals,
  animals,
  enclosures,
  assignments,
  onBack,
  onDeleted,
}: HerdDetailPageContentProps) {
  const activeAnimalsCount = animals.filter((animal) => !animal.isArchived).length
  const effectiveHerdCount =
    activeAnimalsCount > 0 ? activeAnimalsCount : (herd.fallbackCount ?? null)

  const animalController = useHerdDetailAnimalController({
    herdId,
  })

  const visibleAnimals = useMemo(() => {
    return animals.filter((animal) => (animalController.showArchived ? true : !animal.isArchived))
  }, [animalController.showArchived, animals])

  const grouped = useMemo(() => {
    return speciesOptions.map((option) => ({
      ...option,
      animals: visibleAnimals.filter((animal) => animal.species === option.value),
    }))
  }, [visibleAnimals])

  const enclosuresById = useMemo(
    () => new Map(enclosures.map((enclosure) => [enclosure.id, enclosure])),
    [enclosures]
  )

  const activeAssignment = useMemo(
    () => assignments.find((assignment) => !assignment.endTime) ?? null,
    [assignments]
  )

  const assignmentController = useHerdDetailAssignmentController({
    herdId,
    effectiveHerdCount,
    activeAssignment,
    enclosuresById,
  })

  const knownEarTags = useMemo(() => allAnimals.map((animal) => animal.earTag), [allAnimals])
  const editingAnimal = useMemo(
    () => animals.find((animal) => animal.id === animalController.editingAnimalId) ?? null,
    [animalController.editingAnimalId, animals]
  )
  const currentEnclosure = useMemo(
    () => (activeAssignment ? enclosuresById.get(activeAssignment.enclosureId) ?? null : null),
    [activeAssignment, enclosuresById]
  )

  const metaController = useHerdDetailMetaController({
    herd,
    onDeleted,
  })

  const recentAssignments = useMemo(() => assignments.slice(0, 5), [assignments])

  const availableEnclosures = useMemo(
    () =>
      enclosures.filter(
        (enclosure) =>
          !enclosure.herdId ||
          enclosure.herdId === herdId ||
          enclosure.id === assignmentController.selectedEnclosureId
      ),
    [assignmentController.selectedEnclosureId, enclosures, herdId]
  )

  return (
    <div className="space-y-5 rounded-[2rem] bg-[#d8d0bf] p-1 sm:p-2">
      <HerdDetailHeaderCard
        isArchived={herd.isArchived}
        activeAnimalsCount={activeAnimalsCount}
        effectiveHerdCount={effectiveHerdCount}
        currentEnclosureName={currentEnclosure?.name ?? null}
        metaName={metaController.metaName}
        metaFallbackCount={metaController.metaFallbackCount}
        metaNotes={metaController.metaNotes}
        metaDirty={metaController.metaDirty}
        metaSaving={metaController.metaSaving}
        metaSaved={metaController.metaSaved}
        onMetaNameChange={metaController.setMetaName}
        onMetaFallbackCountChange={metaController.setMetaFallbackCount}
        onMetaNotesChange={metaController.setMetaNotes}
        onSubmit={metaController.saveHerdMeta}
        onBack={onBack}
        onDelete={metaController.deleteHerd}
      />

      <HerdDetailAssignmentCard
        currentEnclosureName={currentEnclosure?.name ?? null}
        activeAssignment={activeAssignment}
        effectiveHerdCount={effectiveHerdCount}
        endingAssignmentId={assignmentController.endingAssignmentId}
        selectedEnclosureId={assignmentController.selectedEnclosureId}
        availableEnclosures={availableEnclosures}
        assignmentCount={assignmentController.assignmentCount}
        assignmentNotes={assignmentController.assignmentNotes}
        assignmentError={assignmentController.assignmentError}
        assignmentSaving={assignmentController.assignmentSaving}
        recentAssignments={recentAssignments}
        enclosuresById={enclosuresById}
        onSelectedEnclosureIdChange={assignmentController.setSelectedEnclosureId}
        onAssignmentCountChange={assignmentController.setAssignmentCount}
        onAssignmentNotesChange={assignmentController.setAssignmentNotes}
        onSubmit={assignmentController.assignHerdToEnclosure}
        onEndAssignment={assignmentController.endAssignment}
      />

      <HerdDetailAddAnimalCard
        herdName={herd.name}
        saving={animalController.saving}
        error={animalController.error}
        knownEarTags={knownEarTags}
        earTag={animalController.earTag}
        species={animalController.species}
        name={animalController.name}
        notes={animalController.notes}
        onEarTagChange={animalController.setEarTag}
        onSpeciesChange={animalController.setSpecies}
        onNameChange={animalController.setName}
        onNotesChange={animalController.setNotes}
        onSubmit={animalController.handleAddAnimal}
      />

      {animalController.editingAnimalId ? (
        <HerdDetailAnimalEditCard
          knownEarTags={knownEarTags}
          conflictIgnoreEarTag={editingAnimal?.earTag ?? null}
          editSaving={animalController.editSaving}
          editError={animalController.editError}
          editEarTag={animalController.editEarTag}
          editSpecies={animalController.editSpecies}
          editName={animalController.editName}
          editNotes={animalController.editNotes}
          onEarTagChange={animalController.setEditEarTag}
          onSpeciesChange={animalController.setEditSpecies}
          onNameChange={animalController.setEditName}
          onNotesChange={animalController.setEditNotes}
          onSubmit={animalController.saveEdit}
          onCancel={animalController.cancelEdit}
        />
      ) : null}

      <HerdDetailAnimalList
        herdName={herd.name}
        showArchived={animalController.showArchived}
        visibleAnimals={visibleAnimals}
        grouped={grouped}
        onToggleShowArchived={() => animalController.setShowArchived((current) => !current)}
        onStartEdit={animalController.startEdit}
        onSetAnimalArchived={animalController.setAnimalArchived}
        onDeleteAnimal={animalController.deleteAnimal}
      />
    </div>
  )
}
