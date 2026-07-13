import { formatSince, getDurationSecondsFromIso } from '@/lib/maps/live-position-map-formatters'
import { formatArea } from '@/lib/maps/map-core'
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

export function buildAssignmentIndexes(assignments: EnclosureAssignment[]) {
  const activeAssignmentsByEnclosureId = new Map<string, EnclosureAssignment>()
  const activeAssignmentsByHerdId = new Map<string, EnclosureAssignment>()
  const assignmentHistoryByEnclosureId = new Map<string, EnclosureAssignment[]>()

  assignments.forEach((assignment) => {
    if (!assignment.endTime) {
      if (!activeAssignmentsByEnclosureId.has(assignment.enclosureId)) {
        activeAssignmentsByEnclosureId.set(assignment.enclosureId, assignment)
      }

      if (!activeAssignmentsByHerdId.has(assignment.herdId)) {
        activeAssignmentsByHerdId.set(assignment.herdId, assignment)
      }
    }

    const currentAssignments =
      assignmentHistoryByEnclosureId.get(assignment.enclosureId) ?? []
    currentAssignments.push(assignment)
    assignmentHistoryByEnclosureId.set(assignment.enclosureId, currentAssignments)
  })

  return {
    activeAssignmentsByEnclosureId,
    activeAssignmentsByHerdId,
    assignmentHistoryByEnclosureId,
  }
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

// The list row is the daily overview: for occupied Pferche the herd and how
// long it has been in ("rotate next?"), for free ones the size and rest time
// ("regrown enough?").
export function getEnclosureOccupancySummary(
  enclosure: Enclosure,
  activeAssignment: EnclosureAssignment | undefined,
  stats: EnclosureStats | undefined,
  herdsById: Map<string, Herd>
) {
  if (activeAssignment) {
    const herdName = herdsById.get(activeAssignment.herdId)?.name ?? 'Unbekannte Herde'
    const since = formatSince(activeAssignment.startTime)
    return since ? `${herdName} · ${since}` : herdName
  }

  const area = formatArea(enclosure.areaM2)
  if ((stats?.totalAssignments ?? 0) === 0) return `${area} · noch nie belegt`

  const restedSince = formatSince(stats?.lastEndTime)
  return restedSince ? `${area} · frei ${restedSince}` : area
}

export const enclosureFilterOptions: { id: EnclosureListFilter; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'active', label: 'Belegt' },
  { id: 'free', label: 'Frei' },
]

// Occupied Pferche sort longest-occupied first (the herd due to rotate next),
// free ones longest-rested first (the Pferch with the most regrowth); a Pferch
// that was never occupied counts as fully rested.
function compareLongestOccupiedFirst(left: FilteredEnclosureItem, right: FilteredEnclosureItem) {
  const startDiff = (left.activeAssignment?.startTime ?? '').localeCompare(
    right.activeAssignment?.startTime ?? ''
  )
  if (startDiff !== 0) return startDiff

  return left.enclosure.name.localeCompare(right.enclosure.name, 'de')
}

function compareLongestRestedFirst(left: FilteredEnclosureItem, right: FilteredEnclosureItem) {
  const restDiff = (left.stats?.lastEndTime ?? '').localeCompare(right.stats?.lastEndTime ?? '')
  if (restDiff !== 0) return restDiff

  return left.enclosure.name.localeCompare(right.enclosure.name, 'de')
}

export function buildFilteredEnclosures(
  enclosures: Enclosure[],
  activeAssignmentsByEnclosureId: Map<string, EnclosureAssignment>,
  enclosureStatsById: Map<string, EnclosureStats>,
  filter: EnclosureListFilter
): FilteredEnclosureItem[] {
  const withMeta: FilteredEnclosureItem[] = enclosures.map((enclosure) => ({
    enclosure,
    stats: enclosureStatsById.get(enclosure.id),
    activeAssignment: activeAssignmentsByEnclosureId.get(enclosure.id),
  }))

  const occupied = withMeta
    .filter((item) => Boolean(item.activeAssignment))
    .sort(compareLongestOccupiedFirst)
  const free = withMeta
    .filter((item) => !item.activeAssignment)
    .sort(compareLongestRestedFirst)

  switch (filter) {
    case 'active':
      return occupied
    case 'free':
      return free
    case 'all':
    default:
      return [...occupied, ...free]
  }
}
