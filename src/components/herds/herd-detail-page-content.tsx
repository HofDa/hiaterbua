'use client'

import { useMemo } from 'react'
import { usePageTitle } from '@/components/layout/page-title-store'
import { FormButton } from '@/components/ui/form'
import { updateHerdRecord } from '@/lib/db/repositories/herds'
import { getEffectiveHerdCount } from '@/lib/maps/live-position-map-enclosure-stats'
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
  animals: Animal[]
  enclosures: Enclosure[]
  assignments: EnclosureAssignment[]
  onBack: () => void
  onDeleted: () => void
}

export function HerdDetailPageContent({
  herdId,
  herd,
  animals,
  enclosures,
  assignments,
  onBack,
  onDeleted,
}: HerdDetailPageContentProps) {
  usePageTitle(herd.name)

  async function toggleArchived() {
    await updateHerdRecord(herd.id, { isArchived: !herd.isArchived })
  }
  const activeAnimalsCount = animals.filter((animal) => !animal.isArchived).length
  const effectiveHerdCount = getEffectiveHerdCount(herd, animals)

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
    <div className="space-y-5 rounded-[2rem] bg-page p-1 sm:p-2">
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
        metaError={metaController.metaError}
        onMetaNameChange={metaController.setMetaName}
        onMetaFallbackCountChange={metaController.setMetaFallbackCount}
        onMetaNotesChange={metaController.setMetaNotes}
        onSubmit={metaController.saveHerdMeta}
        onBack={onBack}
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
          onDelete={async () => {
            const animal = animals.find((current) => current.id === animalController.editingAnimalId)
            if (animal) await animalController.deleteAnimal(animal)
          }}
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
      />

      {/* Gefahrenzone: archive and delete live at the very end, away from the
          herd's everyday fields and from the list. */}
      <section aria-labelledby="herd-danger" className="app-panel-sm p-5">
        <h2 id="herd-danger" className="text-lg font-bold text-ink-strong">
          Herde archivieren oder löschen
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Archivieren blendet die Herde aus und lässt sich zurücknehmen. Löschen entfernt sie samt
          Tieren, Weidegängen und Belegungen endgültig.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <FormButton type="button" variant="secondary" onClick={() => void toggleArchived()}>
            {herd.isArchived ? 'Wieder aktivieren' : 'Archivieren'}
          </FormButton>
          <FormButton type="button" variant="danger" onClick={() => void metaController.deleteHerd()}>
            Herde löschen
          </FormButton>
        </div>
      </section>
    </div>
  )
}
