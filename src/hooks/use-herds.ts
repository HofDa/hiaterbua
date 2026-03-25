import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/dexie'

export function useHerds() {
  const herds = useLiveQuery(
    () => db.herds.orderBy('name').toArray(),
    []
  )

  const animals = useLiveQuery(
    () => db.animals.toArray(),
    []
  )

  const activeHerds = useLiveQuery(
    () => db.herds.filter(herd => !herd.isArchived).toArray(),
    []
  )

  const archivedHerds = useLiveQuery(
    () => db.herds.filter(herd => herd.isArchived).toArray(),
    []
  )

  const useHerdById = (id: string) => {
    return useLiveQuery(
      () => db.herds.get(id),
      [id]
    )
  }

  const useHerdAnimals = (herdId: string) => {
    return useLiveQuery(
      () => db.animals
        .filter(animal => animal.herdId === herdId && !animal.isArchived)
        .toArray(),
      [herdId]
    )
  }

  const herdStats = useLiveQuery(async () => {
    const [allHerds, allAnimals] = await Promise.all([
      db.herds.toArray(),
      db.animals.toArray()
    ])

    const activeHerdList = allHerds.filter(h => !h.isArchived)
    const activeAnimalList = allAnimals.filter(a => !a.isArchived)

    return {
      totalHerds: allHerds.length,
      activeHerds: activeHerdList.length,
      archivedHerds: allHerds.length - activeHerdList.length,
      totalAnimals: allAnimals.length,
      activeAnimals: activeAnimalList.length,
      archivedAnimals: allAnimals.length - activeAnimalList.length,
      animalsPerHerd: activeHerdList.map(herd => ({
        herdId: herd.id,
        herdName: herd.name,
        animalCount: activeAnimalList.filter(animal => animal.herdId === herd.id).length
      }))
    }
  }, [])

  return {
    herds,
    animals,
    activeHerds,
    archivedHerds,
    useHerdById,
    useHerdAnimals,
    herdStats,
  }
}
