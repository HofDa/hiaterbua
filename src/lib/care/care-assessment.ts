import type { CareGoalId, HabitatType } from './care-guide'

export type CareTraffic = 'low' | 'spotty' | 'strong'
export type CareUse = 'too_low' | 'fits' | 'too_high'
export type CareScrub = 'too_low' | 'fits' | 'too_high' | 'not_checked'
export type CareNutrients = 'none' | 'localized' | 'strong'
export type ProtectedPlantImpact = 'none' | 'unsure' | 'damaged'
export type CareStatus = 'green' | 'yellow' | 'red'

export type CareAssessmentInput = {
  habitatType: HabitatType
  goals: CareGoalId[]
  use: CareUse
  traffic: CareTraffic
  nutrients: CareNutrients
  protectedPlants: ProtectedPlantImpact
  scrub: CareScrub
}

export type CareAssessmentResult = {
  status: CareStatus
  title: string
  summary: string
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

export function evaluateCareTargets(input: {
  habitatType: HabitatType
  goals: CareGoalId[]
  targetUsePercent: 25 | 50 | 75 | 100
}): CareTargetCheck {
  const notes: string[] = []
  let status: CareTargetCheck['status'] = 'plausible'

  if (input.targetUsePercent === 100 && input.goals.includes('keep_structure')) {
    status = 'review'
    notes.push('100 % deutlich nutzen kann dem Ziel widersprechen, hohe und wenig genutzte Strukturen zu erhalten.')
  }

  if (input.targetUsePercent === 100 && input.goals.includes('protect_plants')) {
    status = 'review'
    notes.push('Bei zu schonenden Pflanzen braucht es meist Teilflächen oder Bestände, die vom 100-%-Nutzungsziel ausgenommen sind.')
  }

  if (nutrientSensitiveHabitats.has(input.habitatType) && !input.goals.includes('avoid_nutrients')) {
    notes.push('Auf dieser eher nährstoffarmen Fläche sollte die Ansammlung von Kot und Urin trotzdem mitbeobachtet werden.')
  }

  if (input.goals.includes('create_open_soil')) {
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
  let status: CareStatus = 'green'
  const reasons: string[] = []
  const actions: string[] = []

  const raise = (next: CareStatus) => {
    const rank: Record<CareStatus, number> = { green: 0, yellow: 1, red: 2 }
    if (rank[next] > rank[status]) status = next
  }

  if (input.use === 'too_low') {
    raise('yellow')
    pushUnique(reasons, 'Zu viel Gras und andere Vegetation bleibt stehen.')
    pushUnique(actions, 'Nutzung gezielt verstärken: kleinere Koppel, längere Nutzung oder Tiere besser lenken.')
  }

  if (input.use === 'too_high') {
    raise('red')
    pushUnique(reasons, 'Die Fläche wirkt zu stark abgefressen oder fast kahl.')
    pushUnique(actions, 'Tiere umtreiben oder den Tierdruck auf dieser Teilfläche reduzieren.')
  }

  if (input.traffic === 'spotty') {
    if (!input.goals.includes('create_open_soil')) {
      raise('yellow')
      pushUnique(reasons, 'Es entstehen bereits mehrere offene Bodenstellen.')
      pushUnique(actions, 'Tiere weniger lange an denselben Stellen stehen lassen.')
    } else {
      pushUnique(reasons, 'Kleine offene Bodenstellen passen zum gewählten Pflegeziel.')
    }
  }

  if (input.traffic === 'strong') {
    raise('red')
    pushUnique(reasons, 'Große kahle Stellen, tiefe Hufspuren, Schlamm oder Erosion sind erkennbar.')
    pushUnique(actions, 'Belastete Stelle entlasten: umtreiben, Zugang ändern oder sensiblen Bereich ausgrenzen.')
  }

  const shouldAvoidNutrients =
    input.goals.includes('avoid_nutrients') || nutrientSensitiveHabitats.has(input.habitatType)

  if (input.nutrients === 'localized' && shouldAvoidNutrients) {
    raise('yellow')
    pushUnique(reasons, 'Tiere sammeln sich wiederholt auf einer kleinen, eher sensiblen Stelle.')
    pushUnique(actions, 'Tränke, Salzstelle oder Ruhebereich verlegen und Aufenthaltsdauer dort verkürzen.')
  }

  if (input.nutrients === 'strong') {
    raise(shouldAvoidNutrients ? 'red' : 'yellow')
    pushUnique(reasons, 'Kot, Urin oder Tieraufenthalt konzentrieren sich stark auf einer kleinen Fläche.')
    pushUnique(actions, 'Konzentrationspunkt verlegen und die Stelle vor weiterer Belastung schützen.')
  }

  if (input.protectedPlants === 'unsure' && input.goals.includes('protect_plants')) {
    raise('yellow')
    pushUnique(reasons, 'Bei wichtigen Pflanzen ist unklar, ob sie geschädigt werden.')
    pushUnique(actions, 'Pflanzenhilfe oder Pflegeplan prüfen; im Zweifel Tiere von diesem Bestand weglenken.')
  }

  if (input.protectedPlants === 'damaged') {
    raise('red')
    pushUnique(reasons, 'Pflanzen, die geschont werden sollen, werden sichtbar geschädigt.')
    pushUnique(actions, 'Betroffenen Bestand sofort entlasten oder vorübergehend ausgrenzen.')
  }

  if (input.goals.includes('reduce_scrub')) {
    if (input.scrub === 'too_low') {
      raise('yellow')
      pushUnique(reasons, 'Junge Sträucher oder Bäume werden weniger genutzt als geplant.')
      pushUnique(actions, 'Tiere gezielter in die verbuschten Bereiche lenken oder Koppel anpassen.')
    }

    if (input.scrub === 'too_high') {
      raise('yellow')
      pushUnique(reasons, 'Gehölze werden stärker verbissen als geplant.')
      pushUnique(actions, 'Zu schonende Gehölze ausgrenzen oder Nutzung auf andere Teilflächen lenken.')
    }
  }

  if (status === 'green' && reasons.length === 0) {
    reasons.push('Die beobachtete Wirkung passt zu den gewählten Pflegezielen.')
  }

  if (status === 'green') {
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
    status,
    title: copy[status].title,
    summary: copy[status].summary,
    reasons,
    actions,
  }
}
