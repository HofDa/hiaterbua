'use client'

import { AnimalFormFields } from '@/components/herds/animal-form-fields'
import { Card, CardContent } from '@/components/ui/card'
import { FormButton } from '@/components/ui/form'
import { ErrorAlert } from '@/components/ui/alert'
import type { Species } from '@/types/domain'

type HerdDetailAnimalEditCardProps = {
  knownEarTags: string[]
  conflictIgnoreEarTag: string | null
  editSaving: boolean
  editError: string
  editEarTag: string
  editSpecies: Species
  editName: string
  editNotes: string
  onEarTagChange: (value: string) => void
  onSpeciesChange: (value: Species) => void
  onNameChange: (value: string) => void
  onNotesChange: (value: string) => void
  onSubmit: (event: React.FormEvent) => void | Promise<void>
  onCancel: () => void
}

export function HerdDetailAnimalEditCard({
  knownEarTags,
  conflictIgnoreEarTag,
  editSaving,
  editError,
  editEarTag,
  editSpecies,
  editName,
  editNotes,
  onEarTagChange,
  onSpeciesChange,
  onNameChange,
  onNotesChange,
  onSubmit,
  onCancel,
}: HerdDetailAnimalEditCardProps) {
  return (
    <Card>
      <CardContent>
        <h2 className="text-lg font-semibold tracking-[-0.02em]">Tier bearbeiten</h2>

        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <AnimalFormFields
            disabled={editSaving}
            earTag={editEarTag}
            onEarTagChange={onEarTagChange}
            knownEarTags={knownEarTags}
            conflictIgnoreEarTag={conflictIgnoreEarTag}
            species={editSpecies}
            onSpeciesChange={onSpeciesChange}
            name={editName}
            onNameChange={onNameChange}
            notes={editNotes}
            onNotesChange={onNotesChange}
            namePlaceholder=""
            notesPlaceholder=""
          />

          {editError && (
            <ErrorAlert>{editError}</ErrorAlert>
          )}

          <FormButton
            type="submit"
            disabled={editSaving}
            variant="primary"
          >
            {editSaving ? 'Speichert …' : 'Änderungen speichern'}
          </FormButton>

          <FormButton
            type="button"
            onClick={onCancel}
            variant="secondary"
          >
            Abbrechen
          </FormButton>
        </form>
      </CardContent>
    </Card>
  )
}
