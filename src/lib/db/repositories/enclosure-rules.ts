import type { Enclosure, EnclosureAssignment } from '@/types/domain'

/**
 * An enclosure stays "active" until a newer version supersedes it. The
 * `supersededAt` / `supersededByEnclosureId` / `rootEnclosureId` / `version`
 * fields are reserved for enclosure versioning, which is not yet implemented —
 * so today every enclosure is active. Display reads filter through this helper
 * anyway, so versioning can be turned on later without revisiting each call site.
 */
export function isActiveEnclosure(enclosure: Enclosure): boolean {
  return !enclosure.supersededAt
}

/** The assignments that are currently open — i.e. have no recorded end time. */
export function selectActiveAssignments(
  assignments: EnclosureAssignment[],
): EnclosureAssignment[] {
  return assignments.filter((assignment) => !assignment.endTime)
}

export type AssignmentConflict = 'enclosure-occupied' | 'herd-assigned-elsewhere'

/**
 * Decides whether a new herd→enclosure assignment may be created, given the
 * currently open assignments. An enclosure may hold only one herd at a time, and
 * a herd may be assigned to only one enclosure at a time. Returns the reason it
 * is blocked, or `null` when the assignment is allowed.
 */
export function findAssignmentConflict(
  activeAssignments: EnclosureAssignment[],
  enclosureId: string,
  herdId: string,
): AssignmentConflict | null {
  if (activeAssignments.some((assignment) => assignment.enclosureId === enclosureId)) {
    return 'enclosure-occupied'
  }

  if (
    activeAssignments.some(
      (assignment) => assignment.herdId === herdId && assignment.enclosureId !== enclosureId,
    )
  ) {
    return 'herd-assigned-elsewhere'
  }

  return null
}
