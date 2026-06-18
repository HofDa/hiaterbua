'use client'

import { AnimalFormFields } from '@/components/herds/animal-form-fields'
import type { Species } from '@/types/domain'

type HerdDetailAddAnimalCardProps = {
  herdName: string
  saving: boolean
  error: string
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
    <section className="app-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.02em]">2. Tier hinzufügen</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Neues Tier wird direkt dieser Herde zugeordnet.
          </p>
        </div>
        <div className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-sm font-semibold text-ink-strong">
          Herde: {herdName}
        </div>
      </div>

      <form className="mt-4 space-y-4" onSubmit={onSubmit}>
        <AnimalFormFields
          disabled={saving}
          earTag={earTag}
          onEarTagChange={onEarTagChange}
          species={species}
          onSpeciesChange={onSpeciesChange}
          name={name}
          onNameChange={onNameChange}
          notes={notes}
          onNotesChange={onNotesChange}
        />

        {error ? (
          <div className="rounded-[1.1rem] border border-error-border bg-error-surface px-4 py-3 text-sm font-medium text-error-ink">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-[1.1rem] border border-border-strong bg-surface-muted px-4 py-4 font-semibold text-ink-strong app-shadow-action disabled:opacity-50"
        >
          {saving ? 'Speichert …' : 'Tier speichern'}
        </button>
      </form>
    </section>
  )
}
