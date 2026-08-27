import type {
  CareFinding,
  CareLitter,
  CareNutrients,
  CareOpenSoil,
  CareScrub,
  CareStatus,
  CareTraffic,
  CareUse,
  HabitatType,
  NutrientInputMode,
  OpenSoilMode,
  ProtectedPlantImpact,
  TargetPercent,
} from '@/types/domain'

export type {
  CareFinding,
  CareLitter,
  CareNutrients,
  CareOpenSoil,
  CareScrub,
  CareStatus,
  CareTraffic,
  CareUse,
  EcologicalObjective,
  ProtectedPlantImpact,
} from '@/types/domain'

export interface CareAssessmentInput {
  habitatType: HabitatType

  // Observational shepherd inputs
  use?: CareUse | null
  scrub?: CareScrub | null
  litter?: CareLitter | null
  openSoil?: CareOpenSoil | null
  traffic?: CareTraffic | null
  nutrients?: CareNutrients | null
  protectedPlants?: ProtectedPlantImpact | null

  // Plan parameters / target modes
  openSoilMode?: OpenSoilMode
  nutrientInputMode?: NutrientInputMode
  hasProtectedPlants?: boolean
  hasScrubReductionTarget?: boolean
  hasLitterReductionTarget?: boolean

  // Or full target objects
  vegetationUse?: {
    targetPercent: TargetPercent
    protectedPlants?: string[]
    manualRemovalPlants?: string[]
  }
  litterReduction?: {
    enabled: boolean
    note?: string
  }
  scrubReduction?: {
    targetPercent?: TargetPercent | null
    protectedWoodyPlants?: string[]
    manualRemovalWoodyPlants?: string[]
  }
  openSoilTarget?: {
    mode?: OpenSoilMode
    maxPercent?: number
    note?: string
  }
  nutrientInput?: {
    mode?: NutrientInputMode
    note?: string
  }
}

export interface CareAssessmentResult {
  status: CareStatus
  title: string
  summary: string
  findings: CareFinding[]
  reasons: string[]
  actions: string[]
}

const nutrientSensitiveHabitats = new Set<HabitatType>([
  'dry_grassland',
  'semi_dry_grassland',
  'nardus_grassland',
  'dwarf_shrub_heath',
])

function pushUnique(target: string[], value: string) {
  if (!target.includes(value)) target.push(value)
}

export type CareTargetCheck = {
  status: 'plausible' | 'review'
  title: string
  notes: string[]
}

export type CareTargetsInput = {
  habitatType: HabitatType
  vegetationUse: {
    targetPercent: TargetPercent
    protectedPlants?: string[]
    manualRemovalPlants?: string[]
  }
  litterReduction?: {
    enabled: boolean
    note?: string
  }
  scrubReduction?: {
    targetPercent?: TargetPercent | null
    protectedWoodyPlants?: string[]
    manualRemovalWoodyPlants?: string[]
  }
  openSoil?: {
    mode?: OpenSoilMode
    maxPercent?: number
    note?: string
  }
  nutrientInput?: {
    mode?: NutrientInputMode
    note?: string
  }
}

export function evaluateCareTargets(input: CareTargetsInput): CareTargetCheck {
  const notes: string[] = []
  let status: CareTargetCheck['status'] = 'plausible'

  if (input.vegetationUse.targetPercent === 100) {
    status = 'review'
    notes.push('100 % Krautnutzung führt zu sehr gleichmäßigem Fraßbild; prüfe, ob Teilflächen für Strukturvielfalt stehen bleiben sollen.')
  }

  if (input.vegetationUse.targetPercent === 100 && (input.vegetationUse.protectedPlants?.length ?? 0) > 0) {
    status = 'review'
    notes.push('Bei zu schonenden Pflanzen der Krautschicht braucht es meist Teilflächen oder Bestände, die vom 100-%-Nutzungsziel ausgenommen sind.')
  }

  if (
    input.scrubReduction?.targetPercent === 100 &&
    (input.scrubReduction.protectedWoodyPlants?.length ?? 0) > 0
  ) {
    status = 'review'
    notes.push('100 % Gehölzreduktion bei gleichzeitig zu schonenden Gehölzen erfordert genaue Ausgrenzung der Schutzbestände.')
  }

  if (
    nutrientSensitiveHabitats.has(input.habitatType) &&
    input.nutrientInput?.mode !== 'avoid'
  ) {
    notes.push('Auf dieser eher nährstoffarmen Fläche sollte die Ansammlung von Kot und Urin trotzdem mitbeobachtet werden.')
  }

  if (input.openSoil?.mode === 'punctual_desired') {
    notes.push('Offene Erde nur punktuell beurteilen; große kahle Stellen, tiefe Hufspuren oder Erosion bleiben ein Stoppsignal.')
  }

  if (notes.length === 0) {
    notes.push('Die gewählten Ziele enthalten keinen offensichtlichen Widerspruch. Die tatsächliche Wirkung muss trotzdem im Gelände kontrolliert werden.')
  }

  return {
    status,
    title: status === 'plausible' ? 'Zielwerte wirken plausibel' : 'Zielwerte nochmals prüfen',
    notes,
  }
}

export function evaluateCareAssessment(input: CareAssessmentInput): CareAssessmentResult {
  const findings: CareFinding[] = []

  // Resolve plan configurations and objective active states
  const isScrubReductionActive =
    input.hasScrubReductionTarget ??
    (input.scrubReduction?.targetPercent !== null && input.scrubReduction?.targetPercent !== undefined)

  const isLitterReductionActive =
    input.hasLitterReductionTarget ??
    (input.litterReduction?.enabled === true)

  const effectiveOpenSoilMode: OpenSoilMode =
    input.openSoilMode ?? input.openSoilTarget?.mode ?? 'not_desired'

  const effectiveNutrientMode: NutrientInputMode =
    input.nutrientInputMode ?? input.nutrientInput?.mode ?? 'avoid'

  const hasProtectedPlants =
    input.hasProtectedPlants ??
    Boolean(
      (input.vegetationUse?.protectedPlants && input.vegetationUse.protectedPlants.length > 0) ||
      (input.scrubReduction?.protectedWoodyPlants && input.scrubReduction.protectedWoodyPlants.length > 0)
    )

  // 1. Missing required observations check (must never silently become green)
  if (input.use === undefined || input.use === null) {
    findings.push({
      status: 'yellow',
      objective: 'vegetationUse',
      reason: 'Beobachtung zur Nutzung von Gras und Kräutern fehlt.',
      actions: ['Feldbeobachtung für Gras und Kräuter durchführen.'],
    })
  }

  const hasSoilObservation =
    (input.openSoil !== undefined && input.openSoil !== null) ||
    (input.traffic !== undefined && input.traffic !== null)

  if (!hasSoilObservation) {
    findings.push({
      status: 'yellow',
      objective: 'openSoil',
      reason: 'Beobachtung zu offenen Bodenstellen / Trittspuren fehlt.',
      actions: ['Boden auf offene Stellen, Hufspuren und Trittschäden prüfen.'],
    })
  }

  if (input.nutrients === undefined || input.nutrients === null) {
    findings.push({
      status: 'yellow',
      objective: 'nutrientInput',
      reason: 'Beobachtung zur Tieransammlung / Nährstoffkonzentration fehlt.',
      actions: ['Lieblingsplätze, Tränke- und Ruhebereiche auf Kot und Urin kontrollieren.'],
    })
  }

  if (isScrubReductionActive && (input.scrub === undefined || input.scrub === null || input.scrub === 'not_checked')) {
    findings.push({
      status: 'yellow',
      objective: 'scrubReduction',
      reason: 'Beobachtung zur Nutzung junger Sträucher und Bäume fehlt, obwohl ein Reduktionsziel aktiv ist.',
      actions: ['Verbuschte Bereiche prüfen, ob Sträucher und Bäume verbissen werden.'],
    })
  }

  if (isLitterReductionActive && (input.litter === undefined || input.litter === null || input.litter === 'not_checked')) {
    findings.push({
      status: 'yellow',
      objective: 'litterReduction',
      reason: 'Beobachtung zum Abbau von altem und verfilztem Gras fehlt, obwohl ein Reduktionsziel aktiv ist.',
      actions: ['Streuauflage und Filz am Boden kontrollieren.'],
    })
  }

  if (hasProtectedPlants && (input.protectedPlants === undefined || input.protectedPlants === null)) {
    findings.push({
      status: 'yellow',
      objective: 'protectedPlants',
      reason: 'Beobachtung zu geschützten Pflanzen fehlt, obwohl Schutzarten hinterlegt sind.',
      actions: ['Zielarten auf Verbiss oder Trittschäden kontrollieren.'],
    })
  }

  // 2. Evaluate vegetationUse
  if (input.use === 'too_low') {
    findings.push({
      status: 'yellow',
      objective: 'vegetationUse',
      reason: 'Zu viel Gras und andere Vegetation bleibt stehen.',
      actions: ['Nutzung gezielt verstärken: kleinere Koppel, längere Standzeit oder Tiere besser lenken.'],
    })
  } else if (input.use === 'too_high') {
    findings.push({
      status: 'red',
      objective: 'vegetationUse',
      reason: 'Die Fläche wirkt zu stark abgefressen oder fast kahl.',
      actions: ['Tiere umtreiben oder den Tierdruck auf dieser Teilfläche sofort reduzieren.'],
    })
  }

  // 3. Evaluate litterReduction (only when litterReduction.enabled === true)
  if (isLitterReductionActive) {
    if (input.litter === 'insufficient') {
      findings.push({
        status: 'yellow',
        objective: 'litterReduction',
        reason: 'Altes und verfilztes Gras wird noch nicht ausreichend reduziert.',
        actions: ['Tiere gezielt in Bereiche mit hohem Filz lenken oder Standzeit anpassen.'],
      })
    }
  }

  // 4. Evaluate scrubReduction (only when scrubReduction is an active objective)
  if (isScrubReductionActive) {
    if (input.scrub === 'too_low') {
      findings.push({
        status: 'yellow',
        objective: 'scrubReduction',
        reason: 'Junge Sträucher oder Bäume werden weniger genutzt als geplant.',
        actions: ['Tiere gezielter in die verbuschten Bereiche lenken oder Koppel anpassen.'],
      })
    } else if (input.scrub === 'too_high') {
      findings.push({
        status: 'yellow',
        objective: 'scrubReduction',
        reason: 'Gehölze werden stärker verbissen als geplant.',
        actions: ['Zu schonende Gehölze ausgrenzen oder Nutzung auf andere Teilflächen lenken.'],
      })
    }
  }

  // 5. Evaluate openSoil (and traffic/trampling/erosion)
  const isTooMuchSoilOrStrongTraffic =
    input.openSoil === 'too_much' || input.traffic === 'strong'

  const isPunctualSoilOrSpottyTraffic =
    input.openSoil === 'punctual' || input.traffic === 'spotty'

  if (isTooMuchSoilOrStrongTraffic) {
    findings.push({
      status: 'red',
      objective: 'openSoil',
      reason: 'Große kahle Stellen, tiefe Hufspuren, Schlamm oder Hangabrutschungen/Erosion sind erkennbar.',
      actions: ['Belastete Stelle sofort entlasten: umtreiben, Zugang verlegen oder sensiblen Bereich ausgrenzen.'],
    })
  } else if (isPunctualSoilOrSpottyTraffic) {
    if (effectiveOpenSoilMode !== 'punctual_desired') {
      findings.push({
        status: 'yellow',
        objective: 'openSoil',
        reason: 'Es entstehen bereits mehrere offene Bodenstellen.',
        actions: ['Tiere weniger lange an denselben Stellen stehen lassen.'],
      })
    }
    // If punctual_desired: punctual open soil is not penalized (neutral/green)
  }

  // 6. Evaluate nutrientInput
  // Rule: Local animal concentration when nutrient input should be avoided -> at least yellow.
  // Rule: Nutrient concentration ignored or informational when nutrient input is explicitly acceptable ('desired').
  if (effectiveNutrientMode === 'avoid') {
    if (input.nutrients === 'localized') {
      findings.push({
        status: 'yellow',
        objective: 'nutrientInput',
        reason: 'Tiere sammeln sich wiederholt auf einer kleinen, sensiblen Stelle (z. B. Tränke, Salz oder Ruheplatz).',
        actions: ['Tränke, Salzstelle oder Ruhebereich verlegen und Aufenthaltsdauer dort verkürzen.'],
      })
    } else if (input.nutrients === 'strong') {
      findings.push({
        status: 'red',
        objective: 'nutrientInput',
        reason: 'Kot, Urin oder Tieraufenthalt konzentrieren sich massiv auf einer kleinen Fläche.',
        actions: ['Konzentrationspunkt sofort verlegen und die Stelle vor weiterer Belastung schützen.'],
      })
    }
  }

  // 7. Evaluate protectedPlants (only when protected plants are configured)
  if (hasProtectedPlants) {
    if (input.protectedPlants === 'damaged') {
      findings.push({
        status: 'red',
        objective: 'protectedPlants',
        reason: 'Pflanzen oder Gehölze, die geschont werden sollen, werden sichtbar geschädigt.',
        actions: ['Betroffenen Bestand sofort entlasten oder vorübergehend ausgrenzen.'],
      })
    } else if (input.protectedPlants === 'uncertain' || input.protectedPlants === 'unsure') {
      findings.push({
        status: 'yellow',
        objective: 'protectedPlants',
        reason: 'Bei wichtigen Pflanzen ist unklar, ob sie geschädigt werden.',
        actions: ['Pflanzenhilfe oder Pflegeplan prüfen; im Zweifel Tiere von diesem Bestand weglenken.'],
      })
    }
  }

  // Determine overall status
  let overallStatus: CareStatus = 'green'
  for (const finding of findings) {
    if (finding.status === 'red') {
      overallStatus = 'red'
      break
    }
    if (finding.status === 'yellow') {
      overallStatus = 'yellow'
    }
  }

  const reasons: string[] = []
  const actions: string[] = []

  for (const finding of findings) {
    pushUnique(reasons, finding.reason)
    for (const action of finding.actions) {
      pushUnique(actions, action)
    }
  }

  if (overallStatus === 'green') {
    reasons.push('Die beobachtete Wirkung passt zu den gewählten Pflegezielen.')
    actions.push('Beweidung wie geplant fortsetzen und später erneut kurz kontrollieren.')
  }

  const copy = {
    green: {
      title: 'Grün – Wirkung passt',
      summary: 'Die Fläche entwickelt sich im Moment in die gewünschte Richtung.',
    },
    yellow: {
      title: 'Gelb – etwas anpassen',
      summary: 'Das Ziel ist noch erreichbar, aber die Nutzung sollte gezielt angepasst werden.',
    },
    red: {
      title: 'Rot – jetzt reagieren',
      summary: 'Es gibt deutliche Zeichen für zu starke oder unerwünschte Wirkung.',
    },
  } satisfies Record<CareStatus, { title: string; summary: string }>

  return {
    status: overallStatus,
    title: copy[overallStatus].title,
    summary: copy[overallStatus].summary,
    findings,
    reasons,
    actions,
  }
}
