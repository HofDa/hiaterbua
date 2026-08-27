import Dexie from 'dexie'
import {
  areCareObservationsComplete,
  buildCanonicalCareAssessment,
  buildCarePlanSnapshot,
  CARE_ASSESSMENT_VERSION,
} from '@/lib/care/care-monitoring-integrity'
import { db } from '@/lib/db/dexie'
import { buildLocalChangeMetadata } from '@/lib/sync/local-metadata'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type { CareMonitoringCheck } from '@/types/domain'

export type CreateCareMonitoringCheckParams = {
  conservationPlanId: string
  enclosureId: string
  grazingSessionId?: string | null
  observedAt?: string
  observations: CareMonitoringCheck['observations']
  note?: string
}

export function listAllCareMonitoringChecks(): Promise<CareMonitoringCheck[]> {
  return db.careMonitoringChecks.toArray()
}

export async function listCareMonitoringChecksForEnclosure(
  enclosureId: string,
): Promise<CareMonitoringCheck[]> {
  const checks = await db.careMonitoringChecks
    .where('[enclosureId+observedAt]')
    .between([enclosureId, Dexie.minKey], [enclosureId, Dexie.maxKey])
    .reverse()
    .toArray()
  return checks
    .filter((check) => !check.deletedAt)
    .sort((left, right) =>
      right.observedAt.localeCompare(left.observedAt) || left.id.localeCompare(right.id),
    )
}

export function getCareMonitoringCheck(
  id: string,
): Promise<CareMonitoringCheck | undefined> {
  return db.careMonitoringChecks.get(id)
}

export async function createCareMonitoringCheck(
  params: CreateCareMonitoringCheckParams,
): Promise<CareMonitoringCheck> {
  const conservationPlanId = params.conservationPlanId.trim()
  const enclosureId = params.enclosureId.trim()
  const grazingSessionId = params.grazingSessionId?.trim() || null
  const observedAt = params.observedAt ?? nowIso()

  if (!conservationPlanId) {
    throw new Error('Pflegecheck braucht einen Pflegeplan.')
  }
  if (!enclosureId) {
    throw new Error('Pflegecheck braucht einen Pferch.')
  }
  if (Number.isNaN(Date.parse(observedAt))) {
    throw new Error('Pflegecheck hat einen ungültigen Beobachtungszeitpunkt.')
  }

  return db.transaction(
    'rw',
    db.careMonitoringChecks,
    db.conservationPlans,
    db.enclosures,
    db.sessions,
    async () => {
      const [plan, enclosure, grazingSession] = await Promise.all([
        db.conservationPlans.get(conservationPlanId),
        db.enclosures.get(enclosureId),
        grazingSessionId ? db.sessions.get(grazingSessionId) : Promise.resolve(undefined),
      ])

      if (!plan || plan.deletedAt) {
        throw new Error('Der ausgewählte Pflegeplan wurde nicht gefunden.')
      }
      if (!enclosure || enclosure.deletedAt) {
        throw new Error('Der ausgewählte Pferch wurde nicht gefunden.')
      }
      if (plan.enclosureId !== enclosureId) {
        throw new Error('Pflegeplan und Pferch gehören nicht zusammen.')
      }
      if (grazingSessionId && (!grazingSession || grazingSession.deletedAt)) {
        throw new Error('Der verknüpfte Weidegang wurde nicht gefunden.')
      }

      const planSnapshot = buildCarePlanSnapshot(plan)
      if (!areCareObservationsComplete(planSnapshot, params.observations)) {
        throw new Error('Pflegecheck ist unvollständig. Bitte alle erforderlichen Beobachtungen beantworten.')
      }
      const assessment = buildCanonicalCareAssessment(planSnapshot, params.observations)
      const timestamp = nowIso()
      const check: CareMonitoringCheck = {
        id: createId('care_monitoring_check'),
        conservationPlanId,
        enclosureId,
        grazingSessionId,
        observedAt,
        observations: { ...params.observations },
        assessment: {
          status: assessment.status,
          findings: assessment.findings.map((finding) => ({
            ...finding,
            actions: [...finding.actions],
          })),
          actions: [...assessment.actions],
        },
        assessmentVersion: CARE_ASSESSMENT_VERSION,
        planSnapshot,
        note: params.note?.trim() || undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
        ...buildLocalChangeMetadata(timestamp),
      }

      await db.careMonitoringChecks.add(check)
      return check
    },
  )
}

export async function deleteCareMonitoringCheck(id: string): Promise<void> {
  await db.careMonitoringChecks.delete(id)
}
