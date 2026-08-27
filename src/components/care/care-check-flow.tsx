'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  ExternalLink,
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
  type CareNutrients,
  type CareScrub,
  type CareTraffic,
  type CareUse,
  type ProtectedPlantImpact,
} from '@/lib/care/care-assessment'
import { getCareFieldQuestionIds, type CareFieldQuestionId } from '@/lib/care/care-field-flow'
import {
  buildPlantImageSearchUrl,
  careGoalOptions,
  habitatOptions,
  type CareGoalId,
  type HabitatType,
} from '@/lib/care/care-guide'
import type { CarePlantReference } from '@/types/domain'
import {
  getConservationPlanByEnclosureId,
  saveConservationPlan,
} from '@/lib/db/repositories/conservation-plans'
import { listActiveEnclosuresByName } from '@/lib/db/repositories/enclosures'
import { cn } from '@/lib/utils/cn'
import { CareInfoGuide } from './care-info-guide'

type View = 'area' | 'overview' | 'plan' | 'check' | 'result'

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
      <span className="block text-base">{title}</span>
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

function ResultPanel({ result }: { result: ReturnType<typeof evaluateCareAssessment> }) {
  const styles = {
    green: 'border-success-border bg-success-surface text-success-ink',
    yellow: 'border-warning-border bg-warning-surface text-warning-ink',
    red: 'border-error-border bg-error-surface text-error-ink',
  }

  return (
    <div className={cn('rounded-[1.35rem] border-2 p-4', styles[result.status])}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-current/20 bg-white/40">
          <Check aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold">{result.title}</h2>
          <p className="mt-1 text-sm font-medium leading-relaxed">{result.summary}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-white/45 px-3.5 py-3">
          <h3 className="font-semibold">Warum?</h3>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed">
            {result.reasons.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-white/45 px-3.5 py-3">
          <h3 className="font-semibold">Was jetzt hilft</h3>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed">
            {result.actions.map((action) => (
              <li key={action}>• {action}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function CarePlanFocusCard({
  habitatType,
  goals,
  targetUse,
  plants,
}: {
  habitatType: HabitatType
  goals: CareGoalId[]
  targetUse: 25 | 50 | 75 | 100
  plants: CarePlantReference[]
}) {
  const habitat = habitatOptions.find((item) => item.id === habitatType)?.label ?? 'Fläche'

  return (
    <div className="rounded-[1.25rem] border-2 border-success-border bg-success-surface p-4 text-success-ink">
      <div className="flex items-center gap-2">
        <ClipboardCheck aria-hidden="true" className="h-5 w-5" />
        <h3 className="font-semibold">Heute wichtig</h3>
      </div>
      <p className="mt-2 text-sm font-medium leading-relaxed">
        {habitat} · Ziel: etwa {targetUse} % der Fläche deutlich genutzt
      </p>
      <ul className="mt-3 space-y-1.5 text-sm leading-relaxed">
        {goals.map((goalId) => {
          const goal = careGoalOptions.find((item) => item.id === goalId)
          return goal ? <li key={goalId}>• {goal.label}</li> : null
        })}
      </ul>
      {plants.length > 0 ? (
        <div className="mt-3 rounded-xl border border-current/15 bg-white/35 px-3 py-2.5 text-sm">
          <strong>Besonders schonen:</strong> {plants.map((plant) => plant.name).join(', ')}
        </div>
      ) : null}
    </div>
  )
}

function QuestionBlock({
  number,
  questionId,
  targetUse,
  use,
  setUse,
  traffic,
  setTraffic,
  nutrients,
  setNutrients,
  scrub,
  setScrub,
  protectedPlants,
  setProtectedPlants,
}: {
  number: number
  questionId: CareFieldQuestionId
  targetUse: 25 | 50 | 75 | 100
  use: CareUse | null
  setUse: (value: CareUse) => void
  traffic: CareTraffic | null
  setTraffic: (value: CareTraffic) => void
  nutrients: CareNutrients | null
  setNutrients: (value: CareNutrients) => void
  scrub: CareScrub | null
  setScrub: (value: CareScrub) => void
  protectedPlants: ProtectedPlantImpact | null
  setProtectedPlants: (value: ProtectedPlantImpact) => void
}) {
  if (questionId === 'use') {
    return (
      <div className="space-y-3">
        <SectionQuestion title={`${number}. Wie stark wurde abgefressen?`} hint={`Ziel: ungefähr ${targetUse} % der Fläche deutlich genutzt.`} />
        <FlowOptionGrid>
          <ObservationChoice value="too_low" current={use} onSelect={setUse} title="Viel bleibt stehen" hint="Große Teile sind kaum genutzt." />
          <ObservationChoice value="fits" current={use} onSelect={setUse} title="Passt" hint="Deutlich genutzt, aber nicht fast kahl." />
          <ObservationChoice value="too_high" current={use} onSelect={setUse} title="Fast kahl" hint="Sehr kurz oder großflächig abgefressen." />
        </FlowOptionGrid>
      </div>
    )
  }

  if (questionId === 'traffic') {
    return (
      <div className="space-y-3">
        <SectionQuestion title={`${number}. Wie sieht der Boden aus?`} hint="Achte auf Hufspuren, kahle Stellen, Schlamm und Erosion." />
        <FlowOptionGrid>
          <ObservationChoice value="low" current={traffic} onSelect={setTraffic} title="Kaum auffällig" hint="Einzelne Hufspuren, Pflanzen stehen noch." />
          <ObservationChoice value="spotty" current={traffic} onSelect={setTraffic} title="Punktuell offen" hint="Kleine Stellen mit sichtbarer Erde." />
          <ObservationChoice value="strong" current={traffic} onSelect={setTraffic} title="Deutlich zu stark" hint="Groß kahl, tiefe Spuren, Schlamm oder Erosion." />
        </FlowOptionGrid>
      </div>
    )
  }

  if (questionId === 'nutrients') {
    return (
      <div className="space-y-3">
        <SectionQuestion title={`${number}. Sammeln sich die Tiere stark an einer Stelle?`} hint="Zum Beispiel bei Tränke, Salz, Schatten oder Nachtlager." />
        <FlowOptionGrid>
          <ObservationChoice value="none" current={nutrients} onSelect={setNutrients} title="Nein" hint="Keine auffällige Konzentration." />
          <ObservationChoice value="localized" current={nutrients} onSelect={setNutrients} title="Etwas" hint="Ein klarer Lieblingsplatz ist erkennbar." />
          <ObservationChoice value="strong" current={nutrients} onSelect={setNutrients} title="Sehr stark" hint="Viel Kot/Urin oder lange Aufenthalte auf kleiner Fläche." />
        </FlowOptionGrid>
      </div>
    )
  }

  if (questionId === 'scrub') {
    return (
      <div className="space-y-3">
        <SectionQuestion title={`${number}. Werden junge Sträucher und Bäume wie geplant gefressen?`} />
        <FlowOptionGrid>
          <ObservationChoice value="too_low" current={scrub} onSelect={setScrub} title="Zu wenig" hint="Viele Triebe bleiben unberührt." />
          <ObservationChoice value="fits" current={scrub} onSelect={setScrub} title="Passt" hint="Schösslinge werden sichtbar genutzt." />
          <ObservationChoice value="too_high" current={scrub} onSelect={setScrub} title="Zu stark" hint="Auch zu schonende Gehölze werden stark verbissen." />
        </FlowOptionGrid>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <SectionQuestion title={`${number}. Werden wichtige Pflanzen geschädigt?`} hint="Bei Unsicherheit lieber „Unsicher“ wählen und die Pflanze nachsehen." />
      <FlowOptionGrid>
        <ObservationChoice value="none" current={protectedPlants} onSelect={setProtectedPlants} title="Nein" hint="Keine sichtbare Schädigung." />
        <ObservationChoice value="unsure" current={protectedPlants} onSelect={setProtectedPlants} title="Unsicher" hint="Ich kann es nicht sicher beurteilen." />
        <ObservationChoice value="damaged" current={protectedPlants} onSelect={setProtectedPlants} title="Ja" hint="Zielpflanzen werden sichtbar gefressen oder niedergetreten." />
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
  const [habitatType, setHabitatType] = useState<HabitatType>('semi_dry_grassland')
  const [goals, setGoals] = useState<CareGoalId[]>(['use_grass_herbs', 'keep_structure'])
  const [targetUse, setTargetUse] = useState<25 | 50 | 75 | 100>(75)
  const [plantInput, setPlantInput] = useState('')
  const [plants, setPlants] = useState<CarePlantReference[]>([])
  const [use, setUse] = useState<CareUse | null>(null)
  const [traffic, setTraffic] = useState<CareTraffic | null>(null)
  const [nutrients, setNutrients] = useState<CareNutrients | null>(null)
  const [protectedPlants, setProtectedPlants] = useState<ProtectedPlantImpact | null>(null)
  const [scrub, setScrub] = useState<CareScrub | null>(null)

  const selectedEnclosure = enclosures?.find((item) => item.id === enclosureId) ?? null
  const areaLabel = selectedEnclosure?.name ?? 'Fläche'
  const planReady = storedPlan?.enclosureId === enclosureId
  const needsScrubCheck = goals.includes('reduce_scrub')
  const needsPlantCheck = goals.includes('protect_plants') || plants.length > 0
  const fieldQuestionIds = useMemo(
    () => getCareFieldQuestionIds({ goals, protectedPlantCount: plants.length }),
    [goals, plants.length],
  )

  const targetCheck = useMemo(
    () => evaluateCareTargets({ habitatType, goals, targetUsePercent: targetUse }),
    [goals, habitatType, targetUse],
  )

  const isCheckComplete =
    use !== null &&
    traffic !== null &&
    nutrients !== null &&
    (!needsScrubCheck || scrub !== null) &&
    (!needsPlantCheck || protectedPlants !== null)

  const result = useMemo(() => {
    if (
      use === null ||
      traffic === null ||
      nutrients === null ||
      (needsScrubCheck && scrub === null) ||
      (needsPlantCheck && protectedPlants === null)
    ) {
      return null
    }

    return evaluateCareAssessment({
      habitatType,
      goals,
      use,
      traffic,
      nutrients,
      protectedPlants:
        needsPlantCheck && protectedPlants !== null ? protectedPlants : 'none',
      scrub: needsScrubCheck && scrub !== null ? scrub : 'not_checked',
    })
  }, [goals, habitatType, needsPlantCheck, needsScrubCheck, nutrients, protectedPlants, scrub, traffic, use])

  const resetObservations = () => {
    setUse(null)
    setTraffic(null)
    setNutrients(null)
    setProtectedPlants(null)
    setScrub(null)
  }

  const resetPlanDraft = () => {
    setHabitatType('semi_dry_grassland')
    setGoals(['use_grass_herbs', 'keep_structure'])
    setTargetUse(75)
    setPlantInput('')
    setPlants([])
    setSaveError('')
    resetObservations()
  }

  useEffect(() => {
    setUse(null)
    setTraffic(null)
    setNutrients(null)
    setProtectedPlants(null)
    setScrub(null)
    setSaveError('')

    if (!enclosureId) {
      return
    }

    if (storedPlan?.enclosureId === enclosureId) {
      setHabitatType(storedPlan.habitatType)
      setGoals(storedPlan.goals)
      setTargetUse(storedPlan.targetUsePercent)
      setPlants(storedPlan.protectedPlants)
      setPlantInput('')
      return
    }

    if (storedPlan === null) {
      setHabitatType('semi_dry_grassland')
      setGoals(['use_grass_herbs', 'keep_structure'])
      setTargetUse(75)
      setPlantInput('')
      setPlants([])
    }
  }, [enclosureId, storedPlan])

  const selectArea = (id: string) => {
    haptic('light')
    if (id !== enclosureId) {
      setEnclosureId(id)
      resetPlanDraft()
    }
  }

  const toggleGoal = (goalId: CareGoalId) => {
    haptic('light')
    setGoals((current) =>
      current.includes(goalId) ? current.filter((id) => id !== goalId) : [...current, goalId],
    )
  }

  const addPlant = () => {
    const name = plantInput.trim()
    if (!name || plants.some((plant) => plant.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      return
    }
    haptic('light')
    setPlants((current) => [...current, { name }])
    setPlantInput('')
    if (!goals.includes('protect_plants')) {
      setGoals((current) => [...current, 'protect_plants'])
    }
  }

  const savePlan = async () => {
    if (!enclosureId || goals.length === 0 || isSavingPlan) {
      return
    }

    setIsSavingPlan(true)
    setSaveError('')

    try {
      await saveConservationPlan({
        enclosureId,
        habitatType,
        goals,
        targetUsePercent: targetUse,
        protectedPlants: plants,
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
              Pflegeziel einmal festlegen. Draußen bleiben danach höchstens fünf einfache Beobachtungen.
            </CardDescription>
          </div>
        </div>
      </Card>

      <Alert variant="info" className="text-sm">
        <Info className="h-4 w-4" />
        <div className="pl-1">
          <strong>Offline gespeichert:</strong> Pflegepläne werden pro Pferch dauerhaft auf diesem Gerät gespeichert und sind Teil des vollständigen App-Backups.
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
                  <span className="block text-base">{enclosure.name}</span>
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
                <div className="rounded-[1.25rem] border-2 border-dashed border-border bg-surface-raised p-4">
                  <div className="flex items-start gap-3">
                    <ClipboardCheck aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
                    <div>
                      <h2 className="text-lg font-semibold text-ink-strong">Pflegeplan einmal einrichten</h2>
                      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                        Hier legt die fachlich verantwortliche Person fest, was auf dieser Fläche erreicht und was geschont werden soll. Der Hirte muss das später nicht jedes Mal neu eingeben.
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
                  goals={goals}
                  targetUse={targetUse}
                  plants={plants}
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
          <div className="space-y-7">
            <div className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink-muted">
              <strong className="text-ink-strong">Nicht für jeden Weidegang:</strong> Dieser Teil ist der Pflegeplan. Im späteren Feldcheck erscheinen daraus nur die wirklich nötigen Beobachtungen.
            </div>

            <div className="space-y-4">
              <SectionQuestion
                title="1. Was für eine Fläche ist das ungefähr?"
                hint="Es muss nicht perfekt bestimmt sein. Wähle die Beschreibung, die am besten passt."
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
                    <span className="block text-base">{option.label}</span>
                    <span className="mt-1 block text-xs font-medium leading-relaxed text-ink-muted">
                      {option.hint}
                    </span>
                  </FlowSelectableTile>
                ))}
              </FlowOptionGrid>
            </div>

            <div className="space-y-4">
              <SectionQuestion
                title="2. Was soll die Beweidung hier bewirken?"
                hint="Mehrere Ziele sind möglich. Nur auswählen, was für diese Fläche wirklich wichtig ist."
              />
              <FlowOptionGrid>
                {careGoalOptions.map((goal) => (
                  <FlowSelectableTile
                    key={goal.id}
                    pressed={goals.includes(goal.id)}
                    onClick={() => toggleGoal(goal.id)}
                  >
                    <span className="block text-base">{goal.label}</span>
                    <span className="mt-1 block text-xs font-medium leading-relaxed text-ink-muted">
                      {goal.hint}
                    </span>
                  </FlowSelectableTile>
                ))}
              </FlowOptionGrid>
            </div>

            <div className="space-y-3 rounded-[1.2rem] border border-border bg-surface-muted p-4">
              <SectionQuestion
                title="3. Wie viel der Fläche soll deutlich genutzt sein?"
                hint="Ein einfacher Zielwert. 100 % ist bei gewünschter Strukturvielfalt oft zu gleichmäßig."
              />
              <div className="grid grid-cols-4 gap-2">
                {([25, 50, 75, 100] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={targetUse === value}
                    onClick={() => {
                      haptic('light')
                      setTargetUse(value)
                    }}
                    className={cn(
                      'min-h-12 rounded-xl border-2 text-sm font-semibold',
                      targetUse === value
                        ? 'border-border-strong bg-accent text-ink-strong'
                        : 'border-border bg-surface-raised text-ink',
                    )}
                  >
                    {value} %
                  </button>
                ))}
              </div>
              <div
                className={cn(
                  'rounded-lg border px-3 py-3 text-sm',
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
            </div>

            <div className="space-y-4">
              <SectionQuestion
                title="4. Gibt es Pflanzen, die besonders geschont werden sollen?"
                hint="Am besten nur wenige wichtige Arten eintragen. Der Hirte sieht sie später direkt im Flächenprofil."
              />

              <div className="flex gap-2">
                <input
                  value={plantInput}
                  onChange={(event) => setPlantInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addPlant()
                    }
                  }}
                  placeholder="z. B. Arnika"
                  className="min-h-12 min-w-0 flex-1 rounded-xl border border-border bg-surface-raised px-3 text-base text-ink-strong outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={addPlant}
                  className="min-h-12 rounded-xl border-2 border-border-strong bg-surface-muted px-4 font-semibold text-ink-strong"
                >
                  Hinzufügen
                </button>
              </div>

              {plants.length > 0 ? (
                <div className="space-y-2">
                  {plants.map((plant) => (
                    <div
                      key={plant.name}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-raised px-3 py-3"
                    >
                      <span className="font-semibold text-ink-strong">{plant.name}</span>
                      <div className="flex gap-2">
                        <a
                          href={buildPlantImageSearchUrl(plant.name)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 text-sm font-semibold text-ink"
                        >
                          <Search aria-hidden="true" className="h-4 w-4" />
                          Bilder/Artinfo
                          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => setPlants((current) => current.filter((item) => item.name !== plant.name))}
                          className="min-h-10 rounded-full px-3 text-sm font-semibold text-error-ink"
                        >
                          Entfernen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-ink-muted">
                  Keine Zielpflanze eingetragen. Das ist in Ordnung, wenn keine bestimmte Art geschützt werden muss.
                </p>
              )}
            </div>

            {saveError ? <ErrorAlert>{saveError}</ErrorAlert> : null}
            <FlowPrimaryAction
              onClick={() => void savePlan()}
              disabled={goals.length === 0 || !enclosureId || isSavingPlan}
            >
              {isSavingPlan ? 'Pflegeplan wird gespeichert …' : 'Pflegeplan speichern'}
            </FlowPrimaryAction>
          </div>
        ) : null}

        {view === 'check' ? (
          <div className="space-y-6">
            <CarePlanFocusCard
              habitatType={habitatType}
              goals={goals}
              targetUse={targetUse}
              plants={plants}
            />

            <div>
              <h2 className="text-xl font-semibold text-ink-strong">Jetzt nur hinschauen</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                Keine Fachbegriffe und keine Planung mehr. Beantworte nur, was du auf der Fläche siehst.
              </p>
            </div>

            {fieldQuestionIds.map((questionId, index) => (
              <QuestionBlock
                key={questionId}
                number={index + 1}
                questionId={questionId}
                targetUse={targetUse}
                use={use}
                setUse={setUse}
                traffic={traffic}
                setTraffic={setTraffic}
                nutrients={nutrients}
                setNutrients={setNutrients}
                scrub={scrub}
                setScrub={setScrub}
                protectedPlants={protectedPlants}
                setProtectedPlants={setProtectedPlants}
              />
            ))}

            {plants.length > 0 ? (
              <div className="rounded-[1.2rem] border border-border bg-surface-raised p-4">
                <h3 className="font-semibold text-ink-strong">Unsicher bei einer Zielpflanze?</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {plants.map((plant) => (
                    <a
                      key={plant.name}
                      href={buildPlantImageSearchUrl(plant.name)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 text-sm font-semibold text-ink"
                    >
                      <Search aria-hidden="true" className="h-4 w-4" />
                      {plant.name}
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

            <CarePlanFocusCard
              habitatType={habitatType}
              goals={goals}
              targetUse={targetUse}
              plants={plants}
            />

            <FlowSecondaryAction onClick={() => setView('check')}>
              Beobachtung korrigieren
            </FlowSecondaryAction>
            <FlowPrimaryAction onClick={startCheck}>
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
