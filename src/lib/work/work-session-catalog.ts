import type { WorkActivityId, WorkType } from '@/types/domain'

export const workTypeOptions: { value: WorkType; label: string }[] = [
  { value: 'herding', label: 'Hüten' },
  { value: 'driving', label: 'Treiben' },
  { value: 'fence', label: 'Zaunbau' },
  { value: 'control', label: 'Kontrolle' },
  { value: 'water', label: 'Wasser' },
  { value: 'transport', label: 'Transport' },
  { value: 'other', label: 'Sonstiges' },
]

export type WorkPickerSectionId =
  | 'guided_herd_management'
  | 'guided_infrastructure'
  | 'guided_animal_care'
  | 'guided_pasture_care'

export type WorkSelection = {
  type: WorkType
  activityId: WorkActivityId | null
}

export type WorkPickerOption = {
  id: string
  label: string
  workType: WorkType
  activityId?: WorkActivityId
}

export type WorkPickerSection = {
  id: WorkPickerSectionId
  label: string
  description: string
  options: WorkPickerOption[]
}

export const defaultWorkPickerSectionId: WorkPickerSectionId = 'guided_herd_management'
export const defaultWorkSelection: WorkSelection = {
  type: 'herding',
  activityId: 'guided_herd_grazing_animals',
}

export const workPickerSections: WorkPickerSection[] = [
  {
    id: 'guided_herd_management',
    label: 'Herdenlenkung',
    description: 'Gelenkte Weideführung',
    options: [
      {
        id: 'guided_access_to_grazing_animals',
        activityId: 'guided_access_to_grazing_animals',
        label: 'Weg zu den Weidetieren und zurück',
        workType: 'transport',
      },
      {
        id: 'guided_lead_grazing_animals',
        activityId: 'guided_lead_grazing_animals',
        label: 'Führen der Weidetiere',
        workType: 'driving',
      },
      {
        id: 'guided_herd_grazing_animals',
        activityId: 'guided_herd_grazing_animals',
        label: 'Hüten der Weidetiere',
        workType: 'herding',
      },
      {
        id: 'guided_collect_grazing_animals',
        activityId: 'guided_collect_grazing_animals',
        label: 'Sammeln der Weidetiere',
        workType: 'driving',
      },
    ],
  },
  {
    id: 'guided_infrastructure',
    label: 'Infrastruktur',
    description: 'Gelenkter Weidegang',
    options: [
      {
        id: 'guided_fence_work',
        activityId: 'guided_fence_work',
        label: 'Zaunarbeiten',
        workType: 'fence',
      },
      {
        id: 'guided_overnight_fence_work',
        activityId: 'guided_overnight_fence_work',
        label: 'Zaunarbeiten für Übernachtung',
        workType: 'fence',
      },
      {
        id: 'guided_material_shift',
        activityId: 'guided_material_shift',
        label: 'Materialverschiebung',
        workType: 'transport',
      },
    ],
  },
  {
    id: 'guided_animal_care',
    label: 'Tierbetreuung',
    description: 'Versorgung und Kontrolle',
    options: [
      {
        id: 'guided_water_supply',
        activityId: 'guided_water_supply',
        label: 'Wasserversorgung der Weidetiere',
        workType: 'water',
      },
      {
        id: 'guided_check_grazing_animals',
        activityId: 'guided_check_grazing_animals',
        label: 'Versorgung / Kontrolle Weidetiere',
        workType: 'control',
      },
      {
        id: 'guided_check_lambing',
        activityId: 'guided_check_lambing',
        label: 'Versorgung / Kontrolle Ablammungen (Muttertiere und Lämmer)',
        workType: 'control',
      },
      {
        id: 'guided_check_herding_dogs',
        activityId: 'guided_check_herding_dogs',
        label: 'Versorgung / Kontrolle Hütehunde',
        workType: 'control',
      },
      {
        id: 'guided_check_guard_dogs',
        activityId: 'guided_check_guard_dogs',
        label: 'Versorgung / Kontrolle Herdenschutzhunde',
        workType: 'control',
      },
    ],
  },
  {
    id: 'guided_pasture_care',
    label: 'Weidepflege',
    description: 'Gelenkter Weidegang',
    options: [
      {
        id: 'guided_brush_clearing_with_grazers',
        activityId: 'guided_brush_clearing_with_grazers',
        label: 'Entbuschung mit Schafen/Ziegen (Koppeln)',
        workType: 'other',
      },
      {
        id: 'guided_detangling',
        activityId: 'guided_detangling',
        label: 'Entfilzung (Pferde und Schafe)',
        workType: 'other',
      },
      {
        id: 'guided_follow_up_grazing',
        activityId: 'guided_follow_up_grazing',
        label: 'Nachweide',
        workType: 'other',
      },
      {
        id: 'guided_fence_work_for_brush_clearing',
        activityId: 'guided_fence_work_for_brush_clearing',
        label: 'Zaunarbeiten für Entbuschung',
        workType: 'fence',
      },
      {
        id: 'guided_trampling_via_overdrive',
        activityId: 'guided_trampling_via_overdrive',
        label: 'Vertritt durch Übertrieb',
        workType: 'driving',
      },
    ],
  },
]

export const reminderOptions = [
  { value: '0', label: 'Keine Erinnerung' },
  { value: '15', label: 'Alle 15 min' },
  { value: '30', label: 'Alle 30 min' },
  { value: '45', label: 'Alle 45 min' },
  { value: '60', label: 'Alle 60 min' },
  { value: '90', label: 'Alle 90 min' },
]
