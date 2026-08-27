'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardCheck,
  ExternalLink,
  HelpCircle,
  Info,
  Leaf,
  Pencil,
  Search,
} from 'lucide-react'
import { Alert, ErrorAlert } from '@/components/ui/alert'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import {
  FlowOptionGrid,
  FlowPrimaryAction,
  FlowSecondaryAction,
  FlowSelectableTile,
  FlowStepHeader,
} from '@/components/ui/mobile-flow'
import { useHapticFeedback } from '@/hooks/use-haptic-feedback'
import {
  evaluateCareAssessment,
  evaluateCareTargets,
  type CareLitter,
  type CareNutrients,
  type CareScrub,
  type CareTraffic,
  type CareUse,
  type EcologicalObjective,
  type ProtectedPlantImpact,
} from '@/lib/care/care-assessment'
import { getCareFieldQuestionIds, type CareFieldQuestionId } from '@/lib/care/care-field-flow'
import {
  buildPlantImageSearchUrl,
  habitatOptions,
  type HabitatType,
  type NutrientInputMode,
  type OpenSoilMode,
  type TargetPercent,
} from '@/lib/care/care-guide'
import {
  getConservationPlanByEnclosureId,
  saveConservationPlan,
} from '@/lib/db/repositories/conservation-plans'
import { createCareMonitoringCheck } from '@/lib/db/repositories/care-monitoring-checks'
import { listActiveEnclosuresByName } from '@/lib/db/repositories/enclosures'
import { cn } from '@/lib/utils/cn'
import { CareInfoGuide } from './care-info-guide'

type View = 'area' | 'overview' | 'plan' | 'check' | 'result'

function InfoDisclosure({
  title = 'Was bedeutet das?',
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const haptic = useHapticFeedback()

  return (
    <div className="rounded-xl border border-border/80 bg-surface-muted/60">
      <button
        type="button"
        onClick={() => {
          haptic('light')
          setOpen((prev) => !prev)
        }}
        className="flex min-h-10 w-full items-center justify-between px-3.5 py-2 text-left text-xs font-semibold text-ink-muted transition-colors hover:text-ink-strong"
      >
        <span className="flex items-center gap-1.5">
          <HelpCircle aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
          {title}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      {open ? (
        <div className="border-t border-border/60 px-3.5 py-2.5 text-xs leading-relaxed text-ink-muted">
          {children}
        </div>
      ) : null}
    </div>
  )
}

function ObservationChoice<T extends string>({
  value,
  current,
  onSelect,
  title,
  hint,
}: {
  value: T
  current: T | null
  onSelect: (value: T) => void
  title: string
  hint: string
}) {
  return (
    <FlowSelectableTile
      pressed={current === value}
      onClick={() => onSelect(value)}
      className="min-h-[5.25rem]"
    >
      <span className="block text-base font-semibold">{title}</span>
      <span className="mt-1 block text-xs font-medium leading-relaxed text-ink-muted">{hint}</span>
    </FlowSelectableTile>
  )
}

function SectionQuestion({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-ink-strong">{title}</h3>
      {hint ? <p className="mt-1 text-sm leading-relaxed text-ink-muted">{hint}</p> : null}
    </div>
  )
}

function PlantTagList({
  plants,
  onRemove,
  placeholder,
}: {
  plants: string[]
  onRemove: (name: string) => void
  placeholder: string
}) {
  if (plants.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-3.5 py-2.5 text-xs text-ink-muted">
        {placeholder}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {plants.map((plant) => (
        <div
          key={plant}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-raised px-3 py-2.5"
        >
          <span className="font-semibold text-ink-strong">{plant}</span>
          <div className="flex gap-2">
            <a
              href={buildPlantImageSearchUrl(plant)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 text-xs font-semibold text-ink"
            >
              <Search aria-hidden="true" className="h-3.5 w-3.5" />
              Bilder/Artinfo
              <ExternalLink aria-hidden="true" className="h-3 w-3" />
            </a>
            <button
              type="button"
              onClick={() => onRemove(plant)}
              className="min-h-9 rounded-full px-3 text-xs font-semibold text-error-ink"
            >
              Entfernen
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function PlantInputRow({
  value,
  onChange,
  onAdd,
  placeholder,
}: {
  value: string
  onChange: (val: string) => void
  onAdd: () => void
  placeholder: string
}) {
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onAdd()
          }
        }}
        placeholder={placeholder}
        className="min-h-12 min-w-0 flex-1 rounded-xl border border-border bg-surface-raised px-3 text-sm text-ink-strong outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        type="button"
        onClick={onAdd}
        className="min-h-12 rounded-xl border-2 border-border-strong bg-surface-muted px-4 text-sm font-semibold text-ink-strong"
      >
        Hinzufügen
      </button>
    </div>
  )
}

const objectiveLabels: Record<EcologicalObjective, string> = {
  vegetationUse: 'Gras und Kräuter',
  litterReduction: 'Altes und verfilztes Gras',
  scrubReduction: 'Junge Sträucher und Bäume',
  openSoil: 'Offene Bodenstellen',
  nutrientInput: 'Ruhe- und Tränkebereiche',
  protectedPlants: 'Schutzpflanzen / Gehölze',
}

function ResultPanel({ result }: { result: ReturnType<typeof evaluateCareAssessment> }) {
  const styles = {
    green: 'border-success-border bg-success-surface text-success-ink',
    yellow: 'border-warning-border bg-warning-surface text-warning-ink',
    red: 'border-error-border bg-error-surface text-error-ink',
  }

  return (
    <div className={cn('rounded-[1.35rem] border-2 p-4 md:p-5', styles[result.status])}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-current/20 bg-white/40">
          <Check aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold">{result.title}</h2>
          <p className="mt-1 text-sm font-medium leading-relaxed">{result.summary}</p>
        </div>
      </div>

      {result.findings.length > 0 ? (
        <div className="mt-4 space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider opacity-90">
            Festgestellte Punkte nach Pflegeziel:
          </h3>
          <div className="space-y-2">
            {result.findings.map((f, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-white/50 p-3 text-sm text-ink-strong"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-ink-strong">
                    {objectiveLabels[f.objective]}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-bold',
                      f.status === 'red'
                        ? 'border border-error-border bg-error-surface text-error-ink'
                        : 'border border-warning-border bg-warning-surface text-warning-ink',
                    )}
                  >
                    {f.status === 'red' ? 'Rot' : 'Gelb'}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{f.reason}</p>
                {f.actions.length > 0 ? (
                  <div className="mt-2 rounded-lg bg-white/50 p-2 text-xs">
                    <span className="font-semibold text-ink-strong">Was jetzt hilft:</span>
                    <ul className="mt-1 space-y-0.5 text-ink">
                      {f.actions.map((act, aIdx) => (
                        <li key={aIdx}>• {act}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-white/45 px-3.5 py-3 text-sm">
          <h3 className="font-semibold">Was jetzt hilft</h3>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            Beweidung wie geplant fortsetzen und die Fläche beim nächsten Weidegang erneut kurz beobachten.
          </p>
        </div>
      )}
    </div>
  )
}

function CarePlanFocusCard({
  habitatType,
  vegTargetPercent,
  protectedPlants,
  manualRemovalPlants,
  litterReductionEnabled,
  scrubTargetPercent,
  protectedWoodyPlants,
  manualRemovalWoodyPlants,
  openSoilMode,
  nutrientInputMode,
}: {
  habitatType: HabitatType
  vegTargetPercent: TargetPercent
  protectedPlants: string[]
  manualRemovalPlants: string[]
  litterReductionEnabled: boolean
  scrubTargetPercent: TargetPercent | null
  protectedWoodyPlants: string[]
  manualRemovalWoodyPlants: string[]
  openSoilMode: OpenSoilMode
  nutrientInputMode: NutrientInputMode
}) {
  const habitat = habitatOptions.find((item) => item.id === habitatType)?.label ?? 'Fläche'
  const allProtected = [...protectedPlants, ...protectedWoodyPlants]
  const allManual = [...manualRemovalPlants, ...manualRemovalWoodyPlants]

  return (
    <div className="rounded-[1.25rem] border-2 border-success-border bg-success-surface p-4 text-success-ink md:p-5">
      <div className="flex items-center gap-2">
        <ClipboardCheck aria-hidden="true" className="h-5 w-5" />
        <h3 className="font-semibold">Heute wichtig</h3>
      </div>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider opacity-80">
        {habitat}
      </p>

      <ul className="mt-3 space-y-2 text-sm font-medium leading-relaxed">
        <li className="flex items-start gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
          <span>
            <strong>{vegTargetPercent} %</strong> der Gras- und Kräuterfläche deutlich nutzen
          </span>
        </li>

        {litterReductionEnabled ? (
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
            <span>Altes und verfilztes Gras reduzieren</span>
          </li>
        ) : null}

        <li className="flex items-start gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
          <span>
            {scrubTargetPercent !== null ? (
              <>
                Junge Sträucher auf etwa <strong>{scrubTargetPercent} %</strong> zurückdrängen
              </>
            ) : (
              'Kein Ziel für junge Sträucher/Bäume (nicht nötig)'
            )}
          </span>
        </li>

        <li className="flex items-start gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
          <span>
            {openSoilMode === 'punctual_desired'
              ? 'Offene Bodenstellen nur punktuell (max. ca. 10 %)'
              : 'Offene Bodenstellen möglichst vermeiden'}
          </span>
        </li>

        <li className="flex items-start gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
          <span>
            {nutrientInputMode === 'avoid'
              ? 'Nährstoffansammlung möglichst vermeiden (Lieblingsplätze entlasten)'
              : 'Nährstoffansammlung auf dieser Fläche unproblematisch'}
          </span>
        </li>
      </ul>

      {allProtected.length > 0 ? (
        <div className="mt-3.5 rounded-xl border border-current/15 bg-white/40 px-3.5 py-2.5 text-sm">
          <strong>Besonders schonen:</strong> {allProtected.join(', ')}
        </div>
      ) : null}

      {allManual.length > 0 ? (
        <div className="mt-2 rounded-xl border border-current/15 bg-white/40 px-3.5 py-2.5 text-sm">
          <strong>Eventuell von Hand entfernen:</strong> {allManual.join(', ')}
        </div>
      ) : null}
    </div>
  )
}

function QuestionBlock({
  number,
  questionId,
  vegTargetPercent,
  scrubTargetPercent,
  use,
  setUse,
  traffic,
  setTraffic,
  nutrients,
  setNutrients,
  litter,
  setLitter,
  scrub,
  setScrub,
  protectedPlantImpact,
  setProtectedPlantImpact,
}: {
  number: number
  questionId: CareFieldQuestionId
  vegTargetPercent: TargetPercent
  scrubTargetPercent: TargetPercent | null
  use: CareUse | null
  setUse: (value: CareUse) => void
  traffic: CareTraffic | null
  setTraffic: (value: CareTraffic) => void
  nutrients: CareNutrients | null
  setNutrients: (value: CareNutrients) => void
  litter: CareLitter | null
  setLitter: (value: CareLitter) => void
  scrub: CareScrub | null
  setScrub: (value: CareScrub) => void
  protectedPlantImpact: ProtectedPlantImpact | null
  setProtectedPlantImpact: (value: ProtectedPlantImpact) => void
}) {
  if (questionId === 'use') {
    return (
      <div className="space-y-3">
        <SectionQuestion
          title={`${number}. Wie stark wurde abgefressen?`}
          hint={`Ziel: ungefähr ${vegTargetPercent} % der Gras- und Kräuterfläche deutlich nutzen.`}
        />
        <FlowOptionGrid>
          <ObservationChoice
            value="too_low"
            current={use}
            onSelect={setUse}
            title="Viel bleibt stehen"
            hint="Große Teile von Gras und Kräutern kaum genutzt."
          />
          <ObservationChoice
            value="fits"
            current={use}
            onSelect={setUse}
            title="Passt"
            hint="Deutlich genutzt, aber nicht fast kahl."
          />
          <ObservationChoice
            value="too_high"
            current={use}
            onSelect={setUse}
            title="Fast kahl"
            hint="Sehr kurz oder großflächig abgefressen."
          />
        </FlowOptionGrid>
      </div>
    )
  }

  if (questionId === 'traffic') {
    return (
      <div className="space-y-3">
        <SectionQuestion
          title={`${number}. Wie sieht der Boden aus?`}
          hint="Achte auf Hufspuren, sichtbare offene Erde, Schlamm und Hangrutschungen."
        />
        <FlowOptionGrid>
          <ObservationChoice
            value="low"
            current={traffic}
            onSelect={setTraffic}
            title="Kaum auffällig"
            hint="Einzelne Hufspuren, Grasnarbe steht noch dicht."
          />
          <ObservationChoice
            value="spotty"
            current={traffic}
            onSelect={setTraffic}
            title="Punktuell offen"
            hint="Kleine Stellen mit sichtbarer Erde."
          />
          <ObservationChoice
            value="strong"
            current={traffic}
            onSelect={setTraffic}
            title="Deutlich zu stark"
            hint="Groß kahl, tiefe Spuren, Schlamm oder Abrutschungen."
          />
        </FlowOptionGrid>
      </div>
    )
  }

  if (questionId === 'nutrients') {
    return (
      <div className="space-y-3">
        <SectionQuestion
          title={`${number}. Sammeln sich die Tiere stark an einer Stelle?`}
          hint="Zum Beispiel bei Tränke, Salz, Schatten, Tor oder Nachtlager."
        />
        <FlowOptionGrid>
          <ObservationChoice
            value="none"
            current={nutrients}
            onSelect={setNutrients}
            title="Nein"
            hint="Keine auffällige Kot- und Urinansammlung."
          />
          <ObservationChoice
            value="localized"
            current={nutrients}
            onSelect={setNutrients}
            title="Etwas"
            hint="Ein klarer Lieblingsplatz ist erkennbar."
          />
          <ObservationChoice
            value="strong"
            current={nutrients}
            onSelect={setNutrients}
            title="Sehr stark"
            hint="Viel Kot/Urin oder lange Aufenthalte auf kleiner Fläche."
          />
        </FlowOptionGrid>
      </div>
    )
  }

  if (questionId === 'litter') {
    return (
      <div className="space-y-3">
        <SectionQuestion
          title={`${number}. Wird altes und verfilztes Gras reduziert?`}
          hint="Achte auf überständiges Altgras, dicke Streuauflage und niedergetretenen Filz."
        />
        <FlowOptionGrid>
          <ObservationChoice
            value="insufficient"
            current={litter}
            onSelect={setLitter}
            title="Zu wenig"
            hint="Dicker Filz und überständiges Altgras bleiben weitgehend unberührt."
          />
          <ObservationChoice
            value="fits"
            current={litter}
            onSelect={setLitter}
            title="Passt"
            hint="Filz wird sichtbar abgefressen, zertreten oder gelockert."
          />
        </FlowOptionGrid>
      </div>
    )
  }

  if (questionId === 'scrub') {
    return (
      <div className="space-y-3">
        <SectionQuestion
          title={`${number}. Werden junge Sträucher und Bäume wie geplant gefressen?`}
          hint={
            scrubTargetPercent !== null
              ? `Ziel: ungefähr ${scrubTargetPercent} % der jungen Sträucher/Bäume zurückdrängen.`
              : undefined
          }
        />
        <FlowOptionGrid>
          <ObservationChoice
            value="too_low"
            current={scrub}
            onSelect={setScrub}
            title="Zu wenig"
            hint="Viele Triebe bleiben unberührt."
          />
          <ObservationChoice
            value="fits"
            current={scrub}
            onSelect={setScrub}
            title="Passt"
            hint="Schösslinge werden sichtbar genutzt."
          />
          <ObservationChoice
            value="too_high"
            current={scrub}
            onSelect={setScrub}
            title="Zu stark"
            hint="Auch zu schonende Gehölze werden stark verbissen."
          />
        </FlowOptionGrid>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <SectionQuestion
        title={`${number}. Werden wichtige Pflanzen oder Gehölze geschädigt?`}
        hint="Bei Unsicherheit lieber „Unsicher“ wählen und die Art nachsehen."
      />
      <FlowOptionGrid>
        <ObservationChoice
          value="none"
          current={protectedPlantImpact}
          onSelect={setProtectedPlantImpact}
          title="Nein"
          hint="Keine sichtbare Schädigung an Schutzarten."
        />
        <ObservationChoice
          value="unsure"
          current={protectedPlantImpact}
          onSelect={setProtectedPlantImpact}
          title="Unsicher"
          hint="Ich kann es im Gelände nicht sicher beurteilen."
        />
        <ObservationChoice
          value="damaged"
          current={protectedPlantImpact}
          onSelect={setProtectedPlantImpact}
          title="Ja"
          hint="Zielarten werden sichtbar geschädigt oder niedergetreten."
        />
      </FlowOptionGrid>
    </div>
  )
}

export function CareCheckFlow() {
  const enclosures = useLiveQuery(() => listActiveEnclosuresByName(), [])
  const haptic = useHapticFeedback()
  const [view, setView] = useState<View>('area')
  const [enclosureId, setEnclosureId] = useState<string>('')
  const storedPlan = useLiveQuery(
    async () =>
      enclosureId ? (await getConservationPlanByEnclosureId(enclosureId)) ?? null : null,
    [enclosureId],
    null,
  )
  const [isSavingPlan, setIsSavingPlan] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [isSavingCheck, setIsSavingCheck] = useState(false)
  const [checkSaveError, setCheckSaveError] = useState('')
  const [isCheckSaved, setIsCheckSaved] = useState(false)

  // 5 separate ecological areas
  const [habitatType, setHabitatType] = useState<HabitatType>('semi_dry_grassland')

  // SECTION 1: Gras und Kräuter
  const [vegTargetPercent, setVegTargetPercent] = useState<TargetPercent>(75)
  const [protectedPlants, setProtectedPlants] = useState<string[]>([])
  const [manualRemovalPlants, setManualRemovalPlants] = useState<string[]>([])
  const [protectedPlantInput, setProtectedPlantInput] = useState('')
  const [manualPlantInput, setManualPlantInput] = useState('')

  // SECTION 2: Altes und verfilztes Gras
  const [litterReductionEnabled, setLitterReductionEnabled] = useState(false)
  const [litterReductionNote, setLitterReductionNote] = useState('')

  // SECTION 3: Junge Sträucher und Bäume
  const [scrubTargetPercent, setScrubTargetPercent] = useState<TargetPercent | null>(null)
  const [protectedWoodyPlants, setProtectedWoodyPlants] = useState<string[]>([])
  const [manualRemovalWoodyPlants, setManualRemovalWoodyPlants] = useState<string[]>([])
  const [protectedWoodyInput, setProtectedWoodyInput] = useState('')
  const [manualWoodyInput, setManualWoodyInput] = useState('')

  // SECTION 4: Offene Bodenstellen
  const [openSoilMode, setOpenSoilMode] = useState<OpenSoilMode>('not_desired')
  const [openSoilNote, setOpenSoilNote] = useState('')

  // SECTION 5: Wo sich Tiere lange aufhalten
  const [nutrientInputMode, setNutrientInputMode] = useState<NutrientInputMode>('avoid')
  const [nutrientInputNote, setNutrientInputNote] = useState('')

  const [planNotes, setPlanNotes] = useState('')

  // Field observations
  const [use, setUse] = useState<CareUse | null>(null)
  const [traffic, setTraffic] = useState<CareTraffic | null>(null)
  const [nutrients, setNutrients] = useState<CareNutrients | null>(null)
  const [protectedPlantImpact, setProtectedPlantImpact] = useState<ProtectedPlantImpact | null>(null)
  const [scrub, setScrub] = useState<CareScrub | null>(null)
  const [litter, setLitter] = useState<CareLitter | null>(null)

  const selectedEnclosure = enclosures?.find((item) => item.id === enclosureId) ?? null
  const areaLabel = selectedEnclosure?.name ?? 'Fläche'
  const planReady = storedPlan?.enclosureId === enclosureId

  const hasScrubTarget = scrubTargetPercent !== null
  const allProtectedPlants = useMemo(
    () => [...protectedPlants, ...protectedWoodyPlants],
    [protectedPlants, protectedWoodyPlants],
  )
  const hasProtectedPlants = allProtectedPlants.length > 0

  const fieldQuestionIds = useMemo(
    () =>
      getCareFieldQuestionIds({
        hasScrubReductionTarget: hasScrubTarget,
        hasProtectedPlants,
        hasLitterReductionTarget: litterReductionEnabled,
      }),
    [hasScrubTarget, hasProtectedPlants, litterReductionEnabled],
  )

  const targetCheck = useMemo(
    () =>
      evaluateCareTargets({
        habitatType,
        vegetationUse: {
          targetPercent: vegTargetPercent,
          protectedPlants,
          manualRemovalPlants,
        },
        litterReduction: {
          enabled: litterReductionEnabled,
          note: litterReductionNote || undefined,
        },
        scrubReduction: {
          targetPercent: scrubTargetPercent,
          protectedWoodyPlants,
          manualRemovalWoodyPlants,
        },
        openSoil: {
          mode: openSoilMode,
          maxPercent: openSoilMode === 'punctual_desired' ? 10 : undefined,
          note: openSoilNote || undefined,
        },
        nutrientInput: {
          mode: nutrientInputMode,
          note: nutrientInputNote || undefined,
        },
      }),
    [
      habitatType,
      litterReductionEnabled,
      litterReductionNote,
      manualRemovalPlants,
      manualRemovalWoodyPlants,
      nutrientInputMode,
      nutrientInputNote,
      openSoilMode,
      openSoilNote,
      protectedPlants,
      protectedWoodyPlants,
      scrubTargetPercent,
      vegTargetPercent,
    ],
  )

  const isCheckComplete =
    use !== null &&
    traffic !== null &&
    nutrients !== null &&
    (!hasScrubTarget || scrub !== null) &&
    (!litterReductionEnabled || litter !== null) &&
    (!hasProtectedPlants || protectedPlantImpact !== null)

  const result = useMemo(() => {
    if (!isCheckComplete || use === null || traffic === null || nutrients === null) {
      return null
    }

    return evaluateCareAssessment({
      habitatType,
      use,
      traffic,
      nutrients,
      scrub: hasScrubTarget && scrub !== null ? scrub : 'not_checked',
      litter: litterReductionEnabled && litter !== null ? litter : 'not_checked',
      protectedPlants:
        hasProtectedPlants && protectedPlantImpact !== null ? protectedPlantImpact : 'none',
      openSoilMode,
      nutrientInputMode,
      hasProtectedPlants,
      hasScrubReductionTarget: hasScrubTarget,
      hasLitterReductionTarget: litterReductionEnabled,
    })
  }, [
    habitatType,
    hasProtectedPlants,
    hasScrubTarget,
    isCheckComplete,
    litter,
    litterReductionEnabled,
    nutrientInputMode,
    nutrients,
    openSoilMode,
    protectedPlantImpact,
    scrub,
    traffic,
    use,
  ])

  const resetObservations = useCallback(() => {
    setUse(null)
    setTraffic(null)
    setNutrients(null)
    setProtectedPlantImpact(null)
    setScrub(null)
    setLitter(null)
    setCheckSaveError('')
    setIsCheckSaved(false)
  }, [])

  const resetPlanDraft = useCallback(() => {
    setHabitatType('semi_dry_grassland')
    setVegTargetPercent(75)
    setProtectedPlants([])
    setManualRemovalPlants([])
    setProtectedPlantInput('')
    setManualPlantInput('')
    setLitterReductionEnabled(false)
    setLitterReductionNote('')
    setScrubTargetPercent(null)
    setProtectedWoodyPlants([])
    setManualRemovalWoodyPlants([])
    setProtectedWoodyInput('')
    setManualWoodyInput('')
    setOpenSoilMode('not_desired')
    setOpenSoilNote('')
    setNutrientInputMode('avoid')
    setNutrientInputNote('')
    setPlanNotes('')
    setSaveError('')
    resetObservations()
  }, [resetObservations])

  useEffect(() => {
    setUse(null)
    setTraffic(null)
    setNutrients(null)
    setProtectedPlantImpact(null)
    setScrub(null)
    setLitter(null)
    setSaveError('')

    if (!enclosureId) {
      return
    }

    if (storedPlan?.enclosureId === enclosureId) {
      setHabitatType(storedPlan.habitatType)
      setVegTargetPercent(storedPlan.vegetationUse.targetPercent)
      setProtectedPlants(storedPlan.vegetationUse.protectedPlants ?? [])
      setManualRemovalPlants(storedPlan.vegetationUse.manualRemovalPlants ?? [])
      setLitterReductionEnabled(Boolean(storedPlan.litterReduction?.enabled))
      setLitterReductionNote(storedPlan.litterReduction?.note ?? '')
      setScrubTargetPercent(storedPlan.scrubReduction?.targetPercent ?? null)
      setProtectedWoodyPlants(storedPlan.scrubReduction?.protectedWoodyPlants ?? [])
      setManualRemovalWoodyPlants(storedPlan.scrubReduction?.manualRemovalWoodyPlants ?? [])
      setOpenSoilMode(storedPlan.openSoil?.mode ?? 'not_desired')
      setOpenSoilNote(storedPlan.openSoil?.note ?? '')
      setNutrientInputMode(storedPlan.nutrientInput?.mode ?? 'avoid')
      setNutrientInputNote(storedPlan.nutrientInput?.note ?? '')
      setPlanNotes(storedPlan.notes ?? '')
      return
    }

    if (storedPlan === null) {
      resetPlanDraft()
    }
  }, [enclosureId, resetPlanDraft, storedPlan])

  const selectArea = (id: string) => {
    haptic('light')
    if (id !== enclosureId) {
      setEnclosureId(id)
      resetPlanDraft()
    }
  }

  const addProtectedPlant = () => {
    const name = protectedPlantInput.trim()
    if (!name || protectedPlants.some((p) => p.toLowerCase() === name.toLowerCase())) {
      return
    }
    haptic('light')
    setProtectedPlants((prev) => [...prev, name])
    setProtectedPlantInput('')
  }

  const addManualPlant = () => {
    const name = manualPlantInput.trim()
    if (!name || manualRemovalPlants.some((p) => p.toLowerCase() === name.toLowerCase())) {
      return
    }
    haptic('light')
    setManualRemovalPlants((prev) => [...prev, name])
    setManualPlantInput('')
  }

  const addProtectedWoody = () => {
    const name = protectedWoodyInput.trim()
    if (!name || protectedWoodyPlants.some((p) => p.toLowerCase() === name.toLowerCase())) {
      return
    }
    haptic('light')
    setProtectedWoodyPlants((prev) => [...prev, name])
    setProtectedWoodyInput('')
  }

  const addManualWoody = () => {
    const name = manualWoodyInput.trim()
    if (!name || manualRemovalWoodyPlants.some((p) => p.toLowerCase() === name.toLowerCase())) {
      return
    }
    haptic('light')
    setManualRemovalWoodyPlants((prev) => [...prev, name])
    setManualWoodyInput('')
  }

  const savePlan = async () => {
    if (!enclosureId || isSavingPlan) {
      return
    }

    setIsSavingPlan(true)
    setSaveError('')

    try {
      await saveConservationPlan({
        enclosureId,
        habitatType,
        vegetationUse: {
          targetPercent: vegTargetPercent,
          protectedPlants,
          manualRemovalPlants,
        },
        litterReduction: {
          enabled: litterReductionEnabled,
          note: litterReductionNote.trim() || undefined,
        },
        scrubReduction: {
          targetPercent: scrubTargetPercent,
          protectedWoodyPlants,
          manualRemovalWoodyPlants,
        },
        openSoil: {
          mode: openSoilMode,
          maxPercent: openSoilMode === 'punctual_desired' ? 10 : undefined,
          note: openSoilNote.trim() || undefined,
        },
        nutrientInput: {
          mode: nutrientInputMode,
          note: nutrientInputNote.trim() || undefined,
        },
        notes: planNotes.trim() || undefined,
      })
      haptic('medium')
      resetObservations()
      setView('overview')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Pflegeplan konnte nicht gespeichert werden.')
    } finally {
      setIsSavingPlan(false)
    }
  }

  const startCheck = () => {
    haptic('light')
    resetObservations()
    setView('check')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveCheck = async () => {
    if (!storedPlan || !result || !isCheckComplete || isSavingCheck || isCheckSaved) {
      return
    }

    setIsSavingCheck(true)
    setCheckSaveError('')

    try {
      await createCareMonitoringCheck({
        conservationPlanId: storedPlan.id,
        enclosureId: storedPlan.enclosureId,
        observations: {
          vegetationUse: use,
          litterReduction: litterReductionEnabled ? litter : null,
          scrubReduction: hasScrubTarget ? scrub : null,
          openSoil: null,
          traffic,
          nutrientConcentration: nutrients,
          protectedPlants: hasProtectedPlants ? protectedPlantImpact : null,
        },
      })
      haptic('medium')
      setIsCheckSaved(true)
    } catch (error) {
      setCheckSaveError(
        error instanceof Error ? error.message : 'Pflegecheck konnte nicht gespeichert werden.',
      )
    } finally {
      setIsSavingCheck(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card variant="panel" className="p-4 md:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-success-border bg-success-surface text-success-ink">
            <Leaf aria-hidden="true" className="h-6 w-6" />
          </span>
          <div>
            <CardTitle className="text-xl md:text-2xl">Pflegecheck</CardTitle>
            <CardDescription className="mt-1 max-w-2xl leading-relaxed">
              Pflegeziele einmal festlegen. Draußen bleiben danach wenige einfache Beobachtungen ohne Fachchinesisch.
            </CardDescription>
          </div>
        </div>
      </Card>

      <Alert variant="info" className="text-sm">
        <Info className="h-4 w-4" />
        <div className="pl-1">
          <strong>Offline gespeichert:</strong> Pflegepläne und abgeschlossene Pflegechecks werden dauerhaft auf diesem Gerät gespeichert und sind Teil des vollständigen App-Backups.
        </div>
      </Alert>

      <Card variant="panel" className="p-4 md:p-5">
        {view !== 'area' ? (
          <FlowStepHeader
            label={
              view === 'plan'
                ? 'Pflegeplan einrichten'
                : view === 'check'
                  ? `Kurzer Feldcheck · ${fieldQuestionIds.length} Fragen`
                  : view === 'result'
                    ? 'Ergebnis'
                    : 'Flächenübersicht'
            }
            sublabel={areaLabel}
            onBack={() => {
              haptic('light')
              setView(view === 'plan' || view === 'check' || view === 'result' ? 'overview' : 'area')
            }}
            className="mb-4"
          />
        ) : null}

        {view === 'area' ? (
          <div className="space-y-4">
            <SectionQuestion
              title="Welche Fläche kontrollierst du?"
              hint="Wähle den Pferch. Der Pflegeplan gehört immer zu genau dieser Fläche."
            />
            <FlowOptionGrid layout="single">
              {(enclosures ?? []).map((enclosure) => (
                <FlowSelectableTile
                  key={enclosure.id}
                  pressed={enclosureId === enclosure.id}
                  onClick={() => selectArea(enclosure.id)}
                >
                  <span className="block text-base font-semibold">{enclosure.name}</span>
                  <span className="mt-1 block text-xs font-medium text-ink-muted">
                    {enclosure.areaHa.toLocaleString('de-DE', { maximumFractionDigits: 2 })} ha
                  </span>
                </FlowSelectableTile>
              ))}
            </FlowOptionGrid>
            {(enclosures?.length ?? 0) === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-ink-muted">
                Noch kein Pferch gespeichert. Lege zuerst einen Pferch an, damit der Pflegeplan eindeutig einer Fläche zugeordnet und gesichert werden kann.
              </p>
            ) : null}
            <FlowPrimaryAction
              onClick={() => {
                haptic('light')
                setView('overview')
              }}
              disabled={(enclosures?.length ?? 0) === 0 || !enclosureId}
            >
              Fläche öffnen <ArrowRight aria-hidden="true" className="ml-2 inline h-5 w-5" />
            </FlowPrimaryAction>
          </div>
        ) : null}

        {view === 'overview' ? (
          <div className="space-y-4">
            {!planReady ? (
              <>
                <div className="rounded-[1.25rem] border-2 border-dashed border-border bg-surface-raised p-4 md:p-5">
                  <div className="flex items-start gap-3">
                    <ClipboardCheck aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
                    <div>
                      <h2 className="text-lg font-semibold text-ink-strong">Pflegeplan einmal einrichten</h2>
                      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                        Hier legt die fachlich verantwortliche Person die 5 Pflegeziele fest. Der Hirte muss das später nicht jedes Mal neu eingeben.
                      </p>
                    </div>
                  </div>
                </div>
                <FlowPrimaryAction onClick={() => setView('plan')}>
                  Pflegeplan einrichten
                </FlowPrimaryAction>
              </>
            ) : (
              <>
                <CarePlanFocusCard
                  habitatType={habitatType}
                  vegTargetPercent={vegTargetPercent}
                  protectedPlants={protectedPlants}
                  manualRemovalPlants={manualRemovalPlants}
                  litterReductionEnabled={litterReductionEnabled}
                  scrubTargetPercent={scrubTargetPercent}
                  protectedWoodyPlants={protectedWoodyPlants}
                  manualRemovalWoodyPlants={manualRemovalWoodyPlants}
                  openSoilMode={openSoilMode}
                  nutrientInputMode={nutrientInputMode}
                />
                <FlowPrimaryAction onClick={startCheck}>
                  Pflegecheck starten
                </FlowPrimaryAction>
                <FlowSecondaryAction onClick={() => setView('plan')}>
                  <Pencil aria-hidden="true" className="mr-2 inline h-4 w-4" />
                  Pflegeplan ändern
                </FlowSecondaryAction>
              </>
            )}

            <FlowSecondaryAction
              onClick={() => {
                haptic('light')
                setView('area')
              }}
            >
              Andere Fläche wählen
            </FlowSecondaryAction>
          </div>
        ) : null}

        {view === 'plan' ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink-muted">
              <strong className="text-ink-strong">Pflegeplan einrichten:</strong> Alle fünf Pflegeziele sind voneinander getrennt. Die Prozentwerte für Gras/Kräuter und für Sträucher/Bäume sind zwei unabhängige Zielwerte.
            </div>

            {/* FLÄCHENTYP */}
            <div className="space-y-3 rounded-[1.25rem] border border-border bg-surface-raised p-4 md:p-5">
              <SectionQuestion
                title="Lebensraumtyp der Fläche"
                hint="Wähle die Beschreibung, die am besten zu dieser Weidefläche passt."
              />
              <FlowOptionGrid>
                {habitatOptions.map((option) => (
                  <FlowSelectableTile
                    key={option.id}
                    pressed={habitatType === option.id}
                    onClick={() => {
                      haptic('light')
                      setHabitatType(option.id)
                    }}
                  >
                    <span className="block text-base font-semibold">{option.label}</span>
                    <span className="mt-1 block text-xs font-medium leading-relaxed text-ink-muted">
                      {option.hint}
                    </span>
                  </FlowSelectableTile>
                ))}
              </FlowOptionGrid>
            </div>

            {/* SECTION 1: Gras und Kräuter */}
            <div className="space-y-4 rounded-[1.25rem] border border-border bg-surface-raised p-4 md:p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-ink-strong">1. Gras und Kräuter</h2>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-ink-muted">
                    Auf wie viel der Fläche sollen Gras und andere niedrige Pflanzen deutlich abgefressen werden?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {([25, 50, 75, 100] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={vegTargetPercent === value}
                    onClick={() => {
                      haptic('light')
                      setVegTargetPercent(value)
                    }}
                    className={cn(
                      'flex min-h-12 items-center justify-center rounded-xl border-2 text-base font-bold transition-colors',
                      vegTargetPercent === value
                        ? 'border-border-strong bg-accent text-ink-strong shadow-sm'
                        : 'border-border bg-surface-muted text-ink hover:bg-surface-raised',
                    )}
                  >
                    {value} %
                  </button>
                ))}
              </div>

              <InfoDisclosure title="Was bedeutet das?">
                Gemeint sind Gräser, Kräuter und andere niedrige Pflanzen. In Fachtexten wird dafür oft &bdquo;Krautschicht&ldquo; verwendet.
              </InfoDisclosure>

              <div className="space-y-2 pt-1">
                <label className="block text-xs font-semibold text-ink-muted">
                  Pflanzen, die geschont werden sollen:
                </label>
                <PlantInputRow
                  value={protectedPlantInput}
                  onChange={setProtectedPlantInput}
                  onAdd={addProtectedPlant}
                  placeholder="z. B. Arnika, Enzian"
                />
                <PlantTagList
                  plants={protectedPlants}
                  onRemove={(name) => setProtectedPlants((p) => p.filter((item) => item !== name))}
                  placeholder="Keine Pflanzen zum Schonen eingetragen."
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="block text-xs font-semibold text-ink-muted">
                  Pflanzen, die eventuell zusätzlich von Hand entfernt werden sollen:
                </label>
                <PlantInputRow
                  value={manualPlantInput}
                  onChange={setManualPlantInput}
                  onAdd={addManualPlant}
                  placeholder="z. B. Jakobskreuzkraut, Weißer Germer"
                />
                <PlantTagList
                  plants={manualRemovalPlants}
                  onRemove={(name) => setManualRemovalPlants((p) => p.filter((item) => item !== name))}
                  placeholder="Keine Pflanzen für manuelle Entfernung eingetragen."
                />
              </div>
            </div>

            {/* SECTION 2: Altes und verfilztes Gras */}
            <div className="space-y-4 rounded-[1.25rem] border border-border bg-surface-raised p-4 md:p-5">
              <div>
                <h2 className="text-lg font-bold text-ink-strong">2. Altes und verfilztes Gras</h2>
                <p className="mt-1 text-sm font-medium leading-relaxed text-ink-muted">
                  Soll hohe, alte oder verfilzte Vegetation reduziert werden?
                </p>
              </div>

              <FlowOptionGrid>
                <FlowSelectableTile
                  pressed={litterReductionEnabled}
                  onClick={() => {
                    haptic('light')
                    setLitterReductionEnabled(true)
                  }}
                >
                  <span className="block text-base font-semibold">Ja</span>
                  <span className="mt-1 block text-xs font-medium leading-relaxed text-ink-muted">
                    Altes Gras, abgestorbener Filz oder überständige Pflanzen sollen durch Weidedruck abgebaut werden.
                  </span>
                </FlowSelectableTile>
                <FlowSelectableTile
                  pressed={!litterReductionEnabled}
                  onClick={() => {
                    haptic('light')
                    setLitterReductionEnabled(false)
                  }}
                >
                  <span className="block text-base font-semibold">Nein</span>
                  <span className="mt-1 block text-xs font-medium leading-relaxed text-ink-muted">
                    Fläche ist nicht verfilzt oder Streuabbau ist kein gesondertes Ziel.
                  </span>
                </FlowSelectableTile>
              </FlowOptionGrid>

              <InfoDisclosure title="Was bedeutet das?">
                Altes, abgestorbenes Gras oder dicker Pflanzenfilz am Boden behindern oft neue Kräuter und Gräser. Beweidung kann diesen Filz öffnen und abbauen. In Fachtexten wird dies oft als &bdquo;Streuauflage&ldquo; oder &bdquo;Verfilzung&ldquo; bezeichnet.
              </InfoDisclosure>

              <div>
                <input
                  value={litterReductionNote}
                  onChange={(e) => setLitterReductionNote(e.target.value)}
                  placeholder="Hinweis zu altem Gras / Filz (optional)"
                  className="min-h-12 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm text-ink-strong outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* SECTION 3: Junge Sträucher und Bäume */}
            <div className="space-y-4 rounded-[1.25rem] border border-border bg-surface-raised p-4 md:p-5">
              <div>
                <h2 className="text-lg font-bold text-ink-strong">3. Junge Sträucher und Bäume</h2>
                <p className="mt-1 text-sm font-medium leading-relaxed text-ink-muted">
                  Auf wie viel der Fläche sollen junge Sträucher oder Bäume deutlich zurückgedrängt werden?
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-ink-muted">
                  Ziel für Sträucher und Bäume (unabhängig vom Gras-Zielwert):
                </label>
                <div className="grid grid-cols-5 gap-2">
                  <button
                    type="button"
                    aria-pressed={scrubTargetPercent === null}
                    onClick={() => {
                      haptic('light')
                      setScrubTargetPercent(null)
                    }}
                    className={cn(
                      'flex min-h-12 items-center justify-center rounded-xl border-2 text-xs font-bold transition-colors',
                      scrubTargetPercent === null
                        ? 'border-border-strong bg-accent text-ink-strong shadow-sm'
                        : 'border-border bg-surface-muted text-ink hover:bg-surface-raised',
                    )}
                  >
                    Kein Ziel
                  </button>
                  {([25, 50, 75, 100] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={scrubTargetPercent === value}
                      onClick={() => {
                        haptic('light')
                        setScrubTargetPercent(value)
                      }}
                      className={cn(
                        'flex min-h-12 items-center justify-center rounded-xl border-2 text-sm font-bold transition-colors',
                        scrubTargetPercent === value
                          ? 'border-border-strong bg-accent text-ink-strong shadow-sm'
                          : 'border-border bg-surface-muted text-ink hover:bg-surface-raised',
                      )}
                    >
                      {value} %
                    </button>
                  ))}
                </div>
              </div>

              <InfoDisclosure title="Was bedeutet das?">
                Gemeint sind junge Gehölze, Schösslinge und Sträucher. In Fachtexten wird dafür oft &bdquo;Gehölzaufwuchs&ldquo; oder &bdquo;Verbuschung&ldquo; verwendet.
              </InfoDisclosure>

              <div className="space-y-2 pt-1">
                <label className="block text-xs font-semibold text-ink-muted">
                  Gehölze, die geschont werden sollen:
                </label>
                <PlantInputRow
                  value={protectedWoodyInput}
                  onChange={setProtectedWoodyInput}
                  onAdd={addProtectedWoody}
                  placeholder="z. B. Wacholder, Eiche"
                />
                <PlantTagList
                  plants={protectedWoodyPlants}
                  onRemove={(name) => setProtectedWoodyPlants((p) => p.filter((item) => item !== name))}
                  placeholder="Keine zu schonenden Gehölze festgelegt."
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="block text-xs font-semibold text-ink-muted">
                  Gehölze, die eventuell von Hand entfernt werden sollen:
                </label>
                <PlantInputRow
                  value={manualWoodyInput}
                  onChange={setManualWoodyInput}
                  onAdd={addManualWoody}
                  placeholder="z. B. Spätblühende Traubenkirsche, Robinie"
                />
                <PlantTagList
                  plants={manualRemovalWoodyPlants}
                  onRemove={(name) => setManualRemovalWoodyPlants((p) => p.filter((item) => item !== name))}
                  placeholder="Keine Gehölze für manuelle Entfernung eingetragen."
                />
              </div>
            </div>

            {/* SECTION 4: Offene Bodenstellen */}
            <div className="space-y-4 rounded-[1.25rem] border border-border bg-surface-raised p-4 md:p-5">
              <div>
                <h2 className="text-lg font-bold text-ink-strong">4. Offene Bodenstellen</h2>
                <p className="mt-1 text-sm font-medium leading-relaxed text-ink-muted">
                  Sollen kleine Stellen mit sichtbarer Erde entstehen?
                </p>
              </div>

              <FlowOptionGrid>
                <FlowSelectableTile
                  pressed={openSoilMode === 'not_desired'}
                  onClick={() => {
                    haptic('light')
                    setOpenSoilMode('not_desired')
                  }}
                >
                  <span className="block text-base font-semibold">Nein, möglichst vermeiden</span>
                  <span className="mt-1 block text-xs font-medium leading-relaxed text-ink-muted">
                    Die Grasnarbe soll dicht und geschlossen bleiben.
                  </span>
                </FlowSelectableTile>
                <FlowSelectableTile
                  pressed={openSoilMode === 'punctual_desired'}
                  onClick={() => {
                    haptic('light')
                    setOpenSoilMode('punctual_desired')
                  }}
                >
                  <span className="block text-base font-semibold">Ja, aber nur punktuell</span>
                  <span className="mt-1 block text-xs font-medium leading-relaxed text-ink-muted">
                    Kleine offene Trittstellen sind als Keimbett für Pflanzen erwünscht.
                  </span>
                </FlowSelectableTile>
              </FlowOptionGrid>

              {openSoilMode === 'punctual_desired' ? (
                <div className="rounded-xl border border-success-border/60 bg-success-surface/40 p-3.5 text-xs font-semibold text-success-ink">
                  Ziel: höchstens ungefähr 10 % der Fläche
                </div>
              ) : null}

              <InfoDisclosure title="Was bedeutet das?">
                Einzelne kleine offene Stellen können Platz für neue Pflanzen schaffen. Größere kahle, schlammige oder erodierende Stellen sind meist zu viel. In Fachtexten wird dies oft als &bdquo;Bodenverwundung&ldquo; oder &bdquo;Trittbelastung&ldquo; bezeichnet.
              </InfoDisclosure>

              <div>
                <input
                  value={openSoilNote}
                  onChange={(e) => setOpenSoilNote(e.target.value)}
                  placeholder="Hinweis zu offenen Stellen (optional)"
                  className="min-h-12 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm text-ink-strong outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* SECTION 5: Wo sich Tiere lange aufhalten */}
            <div className="space-y-4 rounded-[1.25rem] border border-border bg-surface-raised p-4 md:p-5">
              <div>
                <h2 className="text-lg font-bold text-ink-strong">5. Wo sich Tiere lange aufhalten</h2>
                <p className="mt-1 text-sm font-medium leading-relaxed text-ink-muted">
                  Sollen zusätzliche Nährstoffe durch Kot und Urin auf dieser Fläche möglichst vermieden werden?
                </p>
              </div>

              <FlowOptionGrid>
                <FlowSelectableTile
                  pressed={nutrientInputMode === 'avoid'}
                  onClick={() => {
                    haptic('light')
                    setNutrientInputMode('avoid')
                  }}
                >
                  <span className="block text-base font-semibold">Ja, möglichst vermeiden</span>
                  <span className="mt-1 block text-xs font-medium leading-relaxed text-ink-muted">
                    Kot und Urin sollen sich hier nicht konzentrieren (besonders wichtig auf mageren Flächen).
                  </span>
                </FlowSelectableTile>
                <FlowSelectableTile
                  pressed={nutrientInputMode === 'desired'}
                  onClick={() => {
                    haptic('light')
                    setNutrientInputMode('desired')
                  }}
                >
                  <span className="block text-base font-semibold">Hier ist es erwünscht / unproblematisch</span>
                  <span className="mt-1 block text-xs font-medium leading-relaxed text-ink-muted">
                    Zusätzliche Nährstoffe oder Ruheplätze sind auf dieser Fläche kein Problem.
                  </span>
                </FlowSelectableTile>
              </FlowOptionGrid>

              <InfoDisclosure title="Was bedeutet das?">
                Wo viele Tiere lange stehen oder liegen, sammeln sich Kot und Urin. Dadurch gelangen dort besonders viele Nährstoffe in den Boden (in Fachtexten oft &bdquo;Eutrophierung&ldquo; oder &bdquo;Nährstoffeintrag&ldquo; genannt).
              </InfoDisclosure>

              {/* Practical examples */}
              <div className="rounded-xl border border-border bg-surface-muted/60 p-3.5 text-xs text-ink-muted">
                <span className="font-semibold text-ink-strong">Typische Orte mit starker Kot- und Urinansammlung:</span>
                <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  <span className="rounded-lg bg-surface-raised px-2 py-1.5 font-medium text-ink">💧 Tränke</span>
                  <span className="rounded-lg bg-surface-raised px-2 py-1.5 font-medium text-ink">🧂 Salzstelle</span>
                  <span className="rounded-lg bg-surface-raised px-2 py-1.5 font-medium text-ink">🌳 Schattenplatz</span>
                  <span className="rounded-lg bg-surface-raised px-2 py-1.5 font-medium text-ink">🌙 Nachtlager</span>
                  <span className="rounded-lg bg-surface-raised px-2 py-1.5 font-medium text-ink">🌾 Futterstelle</span>
                  <span className="rounded-lg bg-surface-raised px-2 py-1.5 font-medium text-ink">🚪 Tor / Durchgang</span>
                </div>
              </div>

              {/* Guidance when avoid is selected */}
              {nutrientInputMode === 'avoid' ? (
                <div className="rounded-xl border border-warning-border bg-warning-surface p-3.5 text-xs text-warning-ink">
                  <span className="font-semibold">Empfehlungen für empfindliche Flächen:</span>
                  <ul className="mt-1.5 space-y-1 leading-relaxed">
                    <li>• Tränke oder Salzstelle versetzen</li>
                    <li>• Aufenthaltsdauer an Lieblingsplätzen verkürzen</li>
                    <li>• Tiere früher umtreiben</li>
                    <li>• Empfindliche Bereiche bei Bedarf ausgrenzen</li>
                    <li>• Keine dauerhafte Zufütterung auf sensiblen Flächen</li>
                  </ul>
                </div>
              ) : null}

              <div>
                <input
                  value={nutrientInputNote}
                  onChange={(e) => setNutrientInputNote(e.target.value)}
                  placeholder="Hinweis zum Ruhe- und Tränkeverhalten (optional)"
                  className="min-h-12 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm text-ink-strong outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Allgemeine Notizen */}
            <div className="space-y-2 rounded-[1.25rem] border border-border bg-surface-raised p-4 md:p-5">
              <SectionQuestion
                title="Allgemeine Hinweise zum Weidegang"
                hint="Optionale Anmerkungen für Hirten und Dokumentation."
              />
              <textarea
                value={planNotes}
                onChange={(e) => setPlanNotes(e.target.value)}
                placeholder="z. B. Koppelgrenzen beachten, Zaun an Waldrand prüfen …"
                rows={3}
                className="w-full rounded-xl border border-border bg-surface-muted p-3 text-sm text-ink-strong outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Plausibilitätscheck */}
            <div
              className={cn(
                'rounded-xl border p-4 text-sm',
                targetCheck.status === 'review'
                  ? 'border-warning-border bg-warning-surface text-warning-ink'
                  : 'border-success-border bg-success-surface text-success-ink',
              )}
            >
              <div className="font-semibold">{targetCheck.title}</div>
              <ul className="mt-1.5 space-y-1 leading-relaxed">
                {targetCheck.notes.map((note) => (
                  <li key={note}>• {note}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs font-medium opacity-80">
                Plausibilitätscheck, keine automatische naturschutzfachliche Freigabe.
              </p>
            </div>

            {saveError ? <ErrorAlert>{saveError}</ErrorAlert> : null}
            <FlowPrimaryAction
              onClick={() => void savePlan()}
              disabled={!enclosureId || isSavingPlan}
            >
              {isSavingPlan ? 'Pflegeplan wird gespeichert …' : 'Pflegeplan speichern'}
            </FlowPrimaryAction>
          </div>
        ) : null}

        {view === 'check' ? (
          <div className="space-y-6">
            <CarePlanFocusCard
              habitatType={habitatType}
              vegTargetPercent={vegTargetPercent}
              protectedPlants={protectedPlants}
              manualRemovalPlants={manualRemovalPlants}
              litterReductionEnabled={litterReductionEnabled}
              scrubTargetPercent={scrubTargetPercent}
              protectedWoodyPlants={protectedWoodyPlants}
              manualRemovalWoodyPlants={manualRemovalWoodyPlants}
              openSoilMode={openSoilMode}
              nutrientInputMode={nutrientInputMode}
            />

            <div>
              <h2 className="text-xl font-semibold text-ink-strong">Jetzt nur hinschauen</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                Keine Fachbegriffe und keine Planung mehr. Beantworte nur, was du draußen auf der Fläche siehst.
              </p>
            </div>

            {fieldQuestionIds.map((questionId, index) => (
              <QuestionBlock
                key={questionId}
                number={index + 1}
                questionId={questionId}
                vegTargetPercent={vegTargetPercent}
                scrubTargetPercent={scrubTargetPercent}
                use={use}
                setUse={setUse}
                traffic={traffic}
                setTraffic={setTraffic}
                nutrients={nutrients}
                setNutrients={setNutrients}
                litter={litter}
                setLitter={setLitter}
                scrub={scrub}
                setScrub={setScrub}
                protectedPlantImpact={protectedPlantImpact}
                setProtectedPlantImpact={setProtectedPlantImpact}
              />
            ))}

            {allProtectedPlants.length > 0 ? (
              <div className="rounded-[1.2rem] border border-border bg-surface-raised p-4">
                <h3 className="font-semibold text-ink-strong">Unsicher bei einer Zielart?</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {allProtectedPlants.map((plantName) => (
                    <a
                      key={plantName}
                      href={buildPlantImageSearchUrl(plantName)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 text-sm font-semibold text-ink"
                    >
                      <Search aria-hidden="true" className="h-4 w-4" />
                      {plantName}
                      <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            <FlowPrimaryAction
              onClick={() => {
                haptic('medium')
                setView('result')
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              disabled={!isCheckComplete}
            >
              {isCheckComplete ? 'Ampel anzeigen' : 'Bitte alle Fragen beantworten'}
            </FlowPrimaryAction>
          </div>
        ) : null}

        {view === 'result' && result ? (
          <div className="space-y-4">
            <ResultPanel result={result} />

            {isCheckSaved ? (
              <Alert variant="success" className="text-sm">
                <Check className="h-4 w-4" />
                <div className="pl-1 font-semibold">Pflegecheck gespeichert.</div>
              </Alert>
            ) : (
              <>
                {checkSaveError ? <ErrorAlert>{checkSaveError}</ErrorAlert> : null}
                <FlowPrimaryAction
                  onClick={() => void saveCheck()}
                  disabled={isSavingCheck || !isCheckComplete}
                >
                  {isSavingCheck ? 'Pflegecheck wird gespeichert …' : 'Pflegecheck speichern'}
                </FlowPrimaryAction>
              </>
            )}

            <CarePlanFocusCard
              habitatType={habitatType}
              vegTargetPercent={vegTargetPercent}
              protectedPlants={protectedPlants}
              manualRemovalPlants={manualRemovalPlants}
              litterReductionEnabled={litterReductionEnabled}
              scrubTargetPercent={scrubTargetPercent}
              protectedWoodyPlants={protectedWoodyPlants}
              manualRemovalWoodyPlants={manualRemovalWoodyPlants}
              openSoilMode={openSoilMode}
              nutrientInputMode={nutrientInputMode}
            />

            <FlowSecondaryAction onClick={() => setView('check')}>
              Beobachtung korrigieren
            </FlowSecondaryAction>
            <FlowPrimaryAction onClick={startCheck} disabled={!isCheckSaved}>
              Neuer Check auf dieser Fläche
            </FlowPrimaryAction>
            <FlowSecondaryAction onClick={() => setView('overview')}>
              Zur Flächenübersicht
            </FlowSecondaryAction>
          </div>
        ) : null}
      </Card>

      <CareInfoGuide />
    </div>
  )
}
