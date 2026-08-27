import type { CareGoalId, HabitatType } from '@/types/domain'

export type { CareGoalId, HabitatType } from '@/types/domain'

export const habitatOptions: { id: HabitatType; label: string; hint: string }[] = [
  {
    id: 'dry_grassland',
    label: 'Trockenrasen',
    hint: 'Meist lückig, trocken und eher nährstoffarm.',
  },
  {
    id: 'semi_dry_grassland',
    label: 'Halbtrockenrasen',
    hint: 'Artenreiche, eher trockene Wiese oder Weide.',
  },
  {
    id: 'nardus_grassland',
    label: 'Borstgrasrasen',
    hint: 'Nährstoffarme Bergweide mit Borstgras und Kräutern.',
  },
  {
    id: 'productive_pasture',
    label: 'Fettweide',
    hint: 'Produktive, nährstoffreichere Weide.',
  },
  {
    id: 'dwarf_shrub_heath',
    label: 'Zwergstrauchheide',
    hint: 'Niedrige Sträucher wie Heidelbeere oder Alpenrose prägen die Fläche.',
  },
  {
    id: 'wood_pasture',
    label: 'Waldweide',
    hint: 'Offene Weide mit Bäumen und Sträuchern.',
  },
  {
    id: 'other',
    label: 'Andere Fläche',
    hint: 'Wenn keine der Beschreibungen gut passt.',
  },
]

export const careGoalOptions: { id: CareGoalId; label: string; hint: string }[] = [
  {
    id: 'use_grass_herbs',
    label: 'Gräser und Kräuter abfressen',
    hint: 'Die niedrige Vegetation soll deutlich genutzt werden.',
  },
  {
    id: 'reduce_thatch',
    label: 'Altes, verfilztes Gras reduzieren',
    hint: 'Dichte abgestorbene oder überständige Pflanzen sollen weniger werden.',
  },
  {
    id: 'reduce_scrub',
    label: 'Junge Sträucher und Bäume zurückdrängen',
    hint: 'Triebe und Schösslinge sollen gefressen oder geschädigt werden.',
  },
  {
    id: 'keep_structure',
    label: 'Abwechslung erhalten',
    hint: 'Hohe, niedrige und offene Stellen sollen nebeneinander bleiben.',
  },
  {
    id: 'create_open_soil',
    label: 'Kleine offene Bodenstellen schaffen',
    hint: 'Punktuell darf Erde sichtbar werden; keine großen kahlen Flächen.',
  },
  {
    id: 'protect_plants',
    label: 'Bestimmte Pflanzen schonen',
    hint: 'Zielarten oder sensible Bestände dürfen nicht deutlich geschädigt werden.',
  },
  {
    id: 'avoid_nutrients',
    label: 'Nährstoffansammlung vermeiden',
    hint: 'Kot und Urin sollen sich nicht dauerhaft auf kleinen sensiblen Stellen sammeln.',
  },
]

export const simpleTerms = [
  {
    title: 'Gräser und Kräuter',
    technical: 'Krautschicht',
    body: 'Alles, was niedrig am Boden wächst und nicht verholzt ist: Gräser, Kräuter und andere weiche Pflanzen. In Fachtexten heißt das oft Krautschicht.',
  },
  {
    title: 'Spuren durch Hufe',
    technical: 'Trittbelastung',
    body: 'Einzelne Hufspuren sind oft normal. Kritisch wird es bei großen kahlen Stellen, tiefen Löchern, Schlamm oder wenn Boden abgeschwemmt wird.',
  },
  {
    title: 'Zu viele Nährstoffe an einer Stelle',
    technical: 'Nährstoffeintrag / Eutrophierung',
    body: 'Wo Tiere lange stehen oder liegen, sammeln sich Kot und Urin. Dort können wenige stark wachsende Pflanzen andere Arten verdrängen. Besonders auf mageren, artenreichen Flächen ist das oft unerwünscht.',
  },
  {
    title: 'Offene Erde',
    technical: 'Offene Bodenstellen / Bodenverwundung',
    body: 'Kleine offene Stellen können für Samen und manche Insekten wertvoll sein. Große kahle Flächen oder Erosion sind dagegen ein Warnsignal.',
  },
  {
    title: 'Abgefressene junge Triebe',
    technical: 'Verbiss',
    body: 'Wenn Tiere Blätter, Zweige oder junge Triebe von Sträuchern und Bäumen fressen. Das kann zur Offenhaltung erwünscht sein, bei zu schonenden Gehölzen aber auch problematisch.',
  },
]

export function buildPlantImageSearchUrl(plantName: string): string {
  return `https://www.inaturalist.org/search?q=${encodeURIComponent(plantName.trim())}`
}
