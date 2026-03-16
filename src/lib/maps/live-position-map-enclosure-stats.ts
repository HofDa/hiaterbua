import { getDurationSecondsFromIso } from '@/lib/maps/live-position-map-formatters'
import type {
  EnclosureListFilter,
  EnclosureStats,
  FilteredEnclosureItem,
} from '@/lib/maps/live-position-map-helper-types'
import type {
  Animal,
  Enclosure,
  EnclosureAssignment,
  Herd,
} from '@/types/domain'

export function getEffectiveHerdCount(herd: Herd | undefined, animals: Animal[]) {
  const activeAnimalsCount = animals.filter((animal) => !animal.isArchived).length
  if (activeAnimalsCount > 0) return activeAnimalsCount
  return herd?.fallbackCount ?? null
}

export function buildHerdsById(herds: Herd[]) {
  return new Map(herds.map((herd) => [herd.id, herd]))
}

export function buildAnimalsByHerdId(animals: Animal[]) {
  const map = new Map<string, Animal[]>()

  animals.forEach((animal) => {
    const currentAnimals = map.get(animal.herdId) ?? []
    currentAnimals.push(animal)
    map.set(animal.herdId, currentAnimals)
  })

  return map
}

export function buildActiveAssignmentsByEnclosureId(assignments: EnclosureAssignment[]) {
  const map = new Map<string, EnclosureAssignment>()

  assignments.forEach((assignment) => {
    if (!assignment.endTime && !map.has(assignment.enclosureId)) {
      map.set(assignment.enclosureId, assignment)
    }
  })

  return map
}

export function buildActiveAssignmentsByHerdId(assignments: EnclosureAssignment[]) {
  const map = new Map<string, EnclosureAssignment>()

  assignments.forEach((assignment) => {
    if (!assignment.endTime && !map.has(assignment.herdId)) {
      map.set(assignment.herdId, assignment)
    }
  })

  return map
}

export function buildAssignmentHistoryByEnclosureId(assignments: EnclosureAssignment[]) {
  const map = new Map<string, EnclosureAssignment[]>()

  assignments.forEach((assignment) => {
    const currentAssignments = map.get(assignment.enclosureId) ?? []
    currentAssignments.push(assignment)
    map.set(assignment.enclosureId, currentAssignments)
  })

  return map
}

export function getAssignableHerds(
  herds: Herd[],
  activeAssignmentsByHerdId: Map<string, EnclosureAssignment>,
  enclosureId: string
) {
  return herds.filter((herd) => {
    if (herd.isArchived) return false

    const activeAssignment = activeAssignmentsByHerdId.get(herd.id)
    return !activeAssignment || activeAssignment.enclosureId === enclosureId
  })
}

export function buildEnclosureStatsById(
  enclosures: Enclosure[],
  assignmentHistoryByEnclosureId: Map<string, EnclosureAssignment[]>,
  herdsById: Map<string, Herd>,
  animalsByHerdId: Map<string, Animal[]>
) {
  const map = new Map<string, EnclosureStats>()

  enclosures.forEach((enclosure) => {
    const history = assignmentHistoryByEnclosureId.get(enclosure.id) ?? []
    const totalDurationS = history.reduce(
      (sum, assignment) => sum + getDurationSecondsFromIso(assignment.startTime, assignment.endTime),
      0
    )

    const counts = history
      .map((assignment) => {
        if (typeof assignment.count === 'number') return assignment.count

        const herd = herdsById.get(assignment.herdId)
        return getEffectiveHerdCount(herd, animalsByHerdId.get(assignment.herdId) ?? [])
      })
      .filter((count): count is number => typeof count === 'number')

    const uniqueHerdsCount = new Set(history.map((assignment) => assignment.herdId)).size

    map.set(enclosure.id, {
      totalAssignments: history.length,
      totalDurationS,
      averageCount:
        counts.length > 0
          ? Math.round(counts.reduce((sum, count) => sum + count, 0) / counts.length)
          : null,
      lastEndTime:
        history
          .map((assignment) => assignment.endTime ?? assignment.startTime ?? null)
          .filter((value): value is string => Boolean(value))
          .sort()
          .at(-1) ?? null,
      uniqueHerdsCount,
    })
  })

  return map
}

export function buildFilteredEnclosures(
  enclosures: Enclosure[],
  activeAssignmentsByEnclosureId: Map<string, EnclosureAssignment>,
  enclosureStatsById: Map<string, EnclosureStats>,
  filter: EnclosureListFilter
): FilteredEnclosureItem[] {
  const withMeta = enclosures.map((enclosure) => ({
    enclosure,
    stats: enclosureStatsById.get(enclosure.id),
    activeAssignment: activeAssignmentsByEnclosureId.get(enclosure.id),
  }))

  switch (filter) {
    case 'active':
      return withMeta
        .filter((item) => Boolean(item.activeAssignment))
        .sort((left, right) => right.enclosure.updatedAt.localeCompare(left.enclosure.updatedAt))
    case 'unused':
      return withMeta
        .filter((item) => (item.stats?.totalAssignments ?? 0) === 0)
        .sort((left, right) => left.enclosure.name.localeCompare(right.enclosure.name, 'de'))
    case 'most-used':
      return withMeta.sort((left, right) => {
        const assignmentsDiff =
          (right.stats?.totalAssignments ?? 0) - (left.stats?.totalAssignments ?? 0)
        if (assignmentsDiff !== 0) return assignmentsDiff

        const durationDiff = (right.stats?.totalDurationS ?? 0) - (left.stats?.totalDurationS ?? 0)
        if (durationDiff !== 0) return durationDiff

        return left.enclosure.name.localeCompare(right.enclosure.name, 'de')
      })
    case 'all':
    default:
      return withMeta.sort((left, right) =>
        right.enclosure.updatedAt.localeCompare(left.enclosure.updatedAt)
      )
  }
}
