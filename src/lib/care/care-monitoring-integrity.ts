import { evaluateCareAssessment } from '@/lib/care/care-assessment'
import type { CareMonitoringCheck, ConservationPlan } from '@/types/domain'

export const CARE_ASSESSMENT_VERSION = 1 as const

type PlanSnapshot = CareMonitoringCheck['planSnapshot']
type Observations = CareMonitoringCheck['observations']

export function buildCarePlanSnapshot(plan: ConservationPlan): PlanSnapshot {
  return {
    habitatType: plan.habitatType,
    vegetationUse: {
      targetPercent: plan.vegetationUse.targetPercent,
      protectedPlants: [...plan.vegetationUse.protectedPlants],
      manualRemovalPlants: [...plan.vegetationUse.manualRemovalPlants],
    },
    litterReduction: {
      enabled: plan.litterReduction.enabled,
      ...(plan.litterReduction.note !== undefined ? { note: plan.litterReduction.note } : {}),
    },
    scrubReduction: {
      targetPercent: plan.scrubReduction.targetPercent ?? null,
      protectedWoodyPlants: [...plan.scrubReduction.protectedWoodyPlants],
      manualRemovalWoodyPlants: [...plan.scrubReduction.manualRemovalWoodyPlants],
    },
    openSoil: {
      mode: plan.openSoil.mode,
      ...(plan.openSoil.maxPercent !== undefined ? { maxPercent: plan.openSoil.maxPercent } : {}),
      ...(plan.openSoil.note !== undefined ? { note: plan.openSoil.note } : {}),
    },
    nutrientInput: {
      mode: plan.nutrientInput.mode,
      ...(plan.nutrientInput.note !== undefined ? { note: plan.nutrientInput.note } : {}),
    },
  }
}

export function areCareObservationsComplete(snapshot: PlanSnapshot, observations: Observations) {
  const hasProtectedPlants =
    snapshot.vegetationUse.protectedPlants.length > 0 ||
    snapshot.scrubReduction.protectedWoodyPlants.length > 0
  const hasScrubTarget = snapshot.scrubReduction.targetPercent != null

  return (
    observations.vegetationUse !== null &&
    (observations.openSoil !== null || observations.traffic !== null) &&
    observations.nutrientConcentration !== null &&
    (!snapshot.litterReduction.enabled ||
      (observations.litterReduction !== null && observations.litterReduction !== 'not_checked')) &&
    (!hasScrubTarget ||
      (observations.scrubReduction !== null && observations.scrubReduction !== 'not_checked')) &&
    (!hasProtectedPlants || observations.protectedPlants !== null)
  )
}

export function buildCanonicalCareAssessment(
  snapshot: PlanSnapshot,
  observations: Observations,
): CareMonitoringCheck['assessment'] {
  const assessment = evaluateCareAssessment({
    habitatType: snapshot.habitatType,
    use: observations.vegetationUse,
    litter: observations.litterReduction,
    scrub: observations.scrubReduction,
    openSoil: observations.openSoil,
    traffic: observations.traffic,
    nutrients: observations.nutrientConcentration,
    protectedPlants: observations.protectedPlants,
    vegetationUse: snapshot.vegetationUse,
    litterReduction: snapshot.litterReduction,
    scrubReduction: snapshot.scrubReduction,
    openSoilTarget: snapshot.openSoil,
    nutrientInput: snapshot.nutrientInput,
  })

  return {
    status: assessment.status,
    findings: assessment.findings.map((finding) => ({
      ...finding,
      actions: [...finding.actions],
    })),
    actions: [...assessment.actions],
  }
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    )
  }
  return value
}

export function careValuesEqual(left: unknown, right: unknown) {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right))
}

export function validateCanonicalCareMonitoringCheck(check: CareMonitoringCheck): string | null {
  if (check.assessmentVersion !== CARE_ASSESSMENT_VERSION) {
    return `nicht unterstützte Rules-Version ${check.assessmentVersion}`
  }
  if (!areCareObservationsComplete(check.planSnapshot, check.observations)) {
    return 'erforderliche Beobachtungen fehlen'
  }
  const canonical = buildCanonicalCareAssessment(check.planSnapshot, check.observations)
  if (!careValuesEqual(check.assessment, canonical)) {
    return 'gespeichertes Assessment widerspricht Beobachtungen und Plan-Snapshot'
  }
  return null
}

export function areCareMonitoringChecksHistoricallyEqual(
  left: CareMonitoringCheck,
  right: CareMonitoringCheck,
) {
  const immutableContent = (check: CareMonitoringCheck) => ({
    id: check.id,
    observedAt: check.observedAt,
    enclosureId: check.enclosureId,
    conservationPlanId: check.conservationPlanId,
    grazingSessionId: check.grazingSessionId ?? null,
    observations: check.observations,
    assessment: check.assessment,
    planSnapshot: check.planSnapshot,
    assessmentVersion: check.assessmentVersion,
    note: check.note,
    createdAt: check.createdAt,
    updatedAt: check.updatedAt,
  })
  return careValuesEqual(immutableContent(left), immutableContent(right))
}
