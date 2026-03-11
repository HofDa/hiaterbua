'use client'

import { AnimalFormFields } from '@/components/herds/animal-form-fields'
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
    <section className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
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

        {editError ? (
          <div className="rounded-[1.1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {editError}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={editSaving}
            className="rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-3 font-semibold text-neutral-950 shadow-[0_12px_24px_rgba(40,34,26,0.08)] disabled:opacity-50"
          >
            {editSaving ? 'Speichert …' : 'Änderungen speichern'}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 font-semibold text-neutral-950 shadow-sm"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </section>
  )
}
