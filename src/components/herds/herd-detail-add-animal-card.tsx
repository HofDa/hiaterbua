'use client'

import { AnimalFormFields } from '@/components/herds/animal-form-fields'
import type { Species } from '@/types/domain'

type HerdDetailAddAnimalCardProps = {
  herdName: string
  saving: boolean
  error: string
  knownEarTags: string[]
  earTag: string
  species: Species
  name: string
  notes: string
  onEarTagChange: (value: string) => void
  onSpeciesChange: (value: Species) => void
  onNameChange: (value: string) => void
  onNotesChange: (value: string) => void
  onSubmit: (event: React.FormEvent) => void | Promise<void>
}

export function HerdDetailAddAnimalCard({
  herdName,
  saving,
  error,
  knownEarTags,
  earTag,
  species,
  name,
  notes,
  onEarTagChange,
  onSpeciesChange,
  onNameChange,
  onNotesChange,
  onSubmit,
}: HerdDetailAddAnimalCardProps) {
  return (
    <section className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.02em]">2. Tier hinzufügen</h2>
          <p className="mt-2 text-sm text-neutral-700">
            Neues Tier wird direkt dieser Herde zugeordnet.
          </p>
        </div>
        <div className="rounded-full border border-[#ccb98a] bg-[#fffdf6] px-3 py-1.5 text-sm font-semibold text-neutral-950">
          Herde: {herdName}
        </div>
      </div>

      <form className="mt-4 space-y-4" onSubmit={onSubmit}>
        <AnimalFormFields
          disabled={saving}
          earTag={earTag}
          onEarTagChange={onEarTagChange}
          knownEarTags={knownEarTags}
          species={species}
          onSpeciesChange={onSpeciesChange}
          name={name}
          onNameChange={onNameChange}
          notes={notes}
          onNotesChange={onNotesChange}
        />

        {error ? (
          <div className="rounded-[1.1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-4 font-semibold text-neutral-950 shadow-[0_12px_24px_rgba(40,34,26,0.08)] disabled:opacity-50"
        >
          {saving ? 'Speichert …' : 'Tier speichern'}
        </button>
      </form>
    </section>
  )
}
