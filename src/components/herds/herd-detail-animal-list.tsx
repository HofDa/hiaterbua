'use client'

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
      <section className="rounded-[1.5rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">3. Tiere in {herdName}</h2>
            <p className="mt-1 text-sm text-neutral-700">
              Alle angezeigten Tiere gehören zu dieser Herde.
            </p>
          </div>

          <button
            onClick={onToggleShowArchived}
            className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-neutral-950 shadow-sm"
          >
            {showArchived ? 'Nur aktive anzeigen' : 'Archivierte anzeigen'}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        {visibleAnimals.length === 0 ? (
          <div className="rounded-[1.75rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 text-neutral-700 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
            Keine passenden Tiere in dieser Ansicht vorhanden.
          </div>
        ) : (
          grouped.map((group) =>
            group.animals.length > 0 ? (
              <div key={group.value} className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-700">
                  {group.label} ({group.animals.length})
                </h3>

                {group.animals.map((animal) => (
                  <article
                    key={animal.id}
                    className="rounded-[1.75rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-semibold">{animal.earTag}</h4>
                        {animal.name ? (
                          <p className="text-sm text-neutral-700">{animal.name}</p>
                        ) : null}
                        {animal.notes ? (
                          <p className="mt-2 text-sm text-neutral-700">{animal.notes}</p>
                        ) : null}
                        <p className="mt-2 text-xs font-medium text-neutral-700">
                          Status: {animal.isArchived ? 'archiviert' : 'aktiv'}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => onStartEdit(animal)}
                          className="rounded-[1rem] border border-[#ccb98a] bg-[#fffdf6] px-3 py-2 text-sm font-semibold text-neutral-950 shadow-sm"
                        >
                          Bearbeiten
                        </button>

                        <button
                          type="button"
                          onClick={() => void onSetAnimalArchived(animal.id, !animal.isArchived)}
                          className="rounded-[1rem] border border-[#ccb98a] bg-[#fffdf6] px-3 py-2 text-sm font-semibold text-neutral-950 shadow-sm"
                        >
                          {animal.isArchived ? 'Reaktivieren' : 'Archivieren'}
                        </button>

                        <button
                          type="button"
                          onClick={() => void onDeleteAnimal(animal)}
                          className="rounded-[1rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 shadow-sm"
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
