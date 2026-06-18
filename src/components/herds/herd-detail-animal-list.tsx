'use client'

import { metaLabelClassName } from '@/components/ui/typography'
import type { Animal, Species } from '@/types/domain'

type AnimalGroup = {
  value: Species
  label: string
  animals: Animal[]
}

type HerdDetailAnimalListProps = {
  herdName: string
  showArchived: boolean
  visibleAnimals: Animal[]
  grouped: AnimalGroup[]
  onToggleShowArchived: () => void
  onStartEdit: (animal: Animal) => void
  onSetAnimalArchived: (animalId: string, isArchived: boolean) => void | Promise<void>
  onDeleteAnimal: (animal: Animal) => void | Promise<void>
}

export function HerdDetailAnimalList({
  herdName,
  showArchived,
  visibleAnimals,
  grouped,
  onToggleShowArchived,
  onStartEdit,
  onSetAnimalArchived,
  onDeleteAnimal,
}: HerdDetailAnimalListProps) {
  return (
    <>
      <section className="app-panel-sm p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">3. Tiere in {herdName}</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Alle angezeigten Tiere gehören zu dieser Herde.
            </p>
          </div>

          <button
            onClick={onToggleShowArchived}
            className="app-surface-row px-4 py-3 text-sm font-semibold text-ink-strong"
          >
            {showArchived ? 'Nur aktive anzeigen' : 'Archivierte anzeigen'}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        {visibleAnimals.length === 0 ? (
          <div className="app-panel-sm p-5 text-ink-muted">
            Keine passenden Tiere in dieser Ansicht vorhanden.
          </div>
        ) : (
          grouped.map((group) =>
            group.animals.length > 0 ? (
              <div key={group.value} className="space-y-2">
                <h3 className={metaLabelClassName({ size: 'sm' })}>
                  {group.label} ({group.animals.length})
                </h3>

                {group.animals.map((animal) => (
                  <article
                    key={animal.id}
                    className="app-panel-sm p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-semibold">{animal.earTag}</h4>
                        {animal.name ? (
                          <p className="text-sm text-ink-muted">{animal.name}</p>
                        ) : null}
                        {animal.notes ? (
                          <p className="mt-2 text-sm text-ink-muted">{animal.notes}</p>
                        ) : null}
                        <p className="mt-2 text-xs font-medium text-ink-muted">
                          Status: {animal.isArchived ? 'archiviert' : 'aktiv'}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => onStartEdit(animal)}
                          className="rounded-[1rem] border border-border bg-surface-raised px-3 py-2 text-sm font-semibold text-ink-strong shadow-sm"
                        >
                          Bearbeiten
                        </button>

                        <button
                          type="button"
                          onClick={() => void onSetAnimalArchived(animal.id, !animal.isArchived)}
                          className="rounded-[1rem] border border-border bg-surface-raised px-3 py-2 text-sm font-semibold text-ink-strong shadow-sm"
                        >
                          {animal.isArchived ? 'Reaktivieren' : 'Archivieren'}
                        </button>

                        <button
                          type="button"
                          onClick={() => void onDeleteAnimal(animal)}
                          className="rounded-[1rem] border border-error-border bg-error-surface px-3 py-2 text-sm font-semibold text-error-ink shadow-sm"
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null
          )
        )}
      </section>
    </>
  )
}
