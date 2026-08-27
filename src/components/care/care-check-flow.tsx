'use client'

import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowRight,
  Check,
  ExternalLink,
  Info,
  Leaf,
  RotateCcw,
  Search,
} from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
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
import {
  buildPlantImageSearchUrl,
  careGoalOptions,
  habitatOptions,
  type CareGoalId,
  type HabitatType,
} from '@/lib/care/care-guide'
import { listActiveEnclosuresByName } from '@/lib/db/repositories/enclosures'
import { cn } from '@/lib/utils/cn'
import { CareInfoGuide } from './care-info-guide'

type Step = 'area' | 'habitat' | 'goals' | 'plants' | 'observe' | 'result'

type PlantReference = {
  name: string
}

const stepOrder: Step[] = ['area', 'habitat', 'goals', 'plants', 'observe', 'result']

function ObservationChoice<T extends string>({
  value,
  current,
  onSelect,
  title,
  hint,
}: {
  value: T
  current: T
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

export function CareCheckFlow() {
  const enclosures = useLiveQuery(() => listActiveEnclosuresByName(), [])
  const haptic = useHapticFeedback()
  const [step, setStep] = useState<Step>('area')
  const [enclosureId, setEnclosureId] = useState<string>('')
  const [habitatType, setHabitatType] = useState<HabitatType>('semi_dry_grassland')
  const [goals, setGoals] = useState<CareGoalId[]>(['use_grass_herbs', 'keep_structure'])
  const [targetUse, setTargetUse] = useState<25 | 50 | 75 | 100>(75)
  const [plantInput, setPlantInput] = useState('')
  const [plants, setPlants] = useState<PlantReference[]>([])
  const [use, setUse] = useState<CareUse>('fits')
  const [traffic, setTraffic] = useState<CareTraffic>('low')
  const [nutrients, setNutrients] = useState<CareNutrients>('none')
  const [protectedPlants, setProtectedPlants] = useState<ProtectedPlantImpact>('none')
  const [scrub, setScrub] = useState<CareScrub>('not_checked')

  const selectedEnclosure = enclosures?.find((item) => item.id === enclosureId) ?? null
  const stepIndex = stepOrder.indexOf(step)
  const needsScrubCheck = goals.includes('reduce_scrub')
  const needsPlantCheck = goals.includes('protect_plants') || plants.length > 0

  const targetCheck = useMemo(
    () => evaluateCareTargets({ habitatType, goals, targetUsePercent: targetUse }),
    [goals, habitatType, targetUse],
  )

  const result = useMemo(
    () =>
      evaluateCareAssessment({
        habitatType,
        goals,
        use,
        traffic,
        nutrients,
        protectedPlants: needsPlantCheck ? protectedPlants : 'none',
        scrub: needsScrubCheck ? scrub : 'not_checked',
      }),
    [goals, habitatType, needsPlantCheck, needsScrubCheck, nutrients, protectedPlants, scrub, traffic, use],
  )

  const goNext = () => {
    const next = stepOrder[stepIndex + 1]
    if (next) {
      haptic('light')
      setStep(next)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const goBack = () => {
    const previous = stepOrder[stepIndex - 1]
    if (previous) {
      haptic('light')
      setStep(previous)
      window.scrollTo({ top: 0, behavior: 'smooth' })
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

  const reset = () => {
    haptic('medium')
    setStep('area')
    setEnclosureId('')
    setHabitatType('semi_dry_grassland')
    setGoals(['use_grass_herbs', 'keep_structure'])
    setTargetUse(75)
    setPlantInput('')
    setPlants([])
    setUse('fits')
    setTraffic('low')
    setNutrients('none')
    setProtectedPlants('none')
    setScrub('not_checked')
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
              Ziele einfach festlegen, draußen kurz hinschauen und entscheiden: weiterweiden, anpassen oder umtreiben.
            </CardDescription>
          </div>
        </div>
      </Card>

      <Alert variant="info" className="text-sm">
        <Info className="h-4 w-4" />
        <div className="pl-1">
          <strong>Testversion:</strong> Dieser Flow speichert noch keine Vertragsdaten. So kann die Bedienung zuerst im Feld getestet werden, ohne ungesicherte neue Daten in Backup/Import einzuführen.
        </div>
      </Alert>

      <Card variant="panel" className="p-4 md:p-5">
        {step !== 'area' ? (
          <FlowStepHeader
            label={`Schritt ${stepIndex + 1} von ${stepOrder.length}`}
            sublabel={selectedEnclosure?.name ?? 'Pflegecheck'}
            onBack={goBack}
            className="mb-4"
          />
        ) : null}

        {step === 'area' ? (
          <div className="space-y-4">
            <SectionQuestion
              title="Welche Fläche kontrollierst du?"
              hint="Wenn der Pferch schon in der App ist, werden Name und Größe direkt übernommen."
            />
            <FlowOptionGrid layout="single">
              {(enclosures ?? []).map((enclosure) => (
                <FlowSelectableTile
                  key={enclosure.id}
                  pressed={enclosureId === enclosure.id}
                  onClick={() => {
                    haptic('light')
                    setEnclosureId(enclosure.id)
                  }}
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
                Noch kein Pferch gespeichert. Der Pflegecheck kann trotzdem ausprobiert werden.
              </p>
            ) : null}
            <FlowPrimaryAction onClick={goNext}>
              Weiter <ArrowRight aria-hidden="true" className="ml-2 inline h-5 w-5" />
            </FlowPrimaryAction>
          </div>
        ) : null}

        {step === 'habitat' ? (
          <div className="space-y-4">
            <SectionQuestion
              title="Was für eine Fläche ist das ungefähr?"
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
            <FlowPrimaryAction onClick={goNext}>Weiter</FlowPrimaryAction>
          </div>
        ) : null}

        {step === 'goals' ? (
          <div className="space-y-5">
            <SectionQuestion
              title="Was soll die Beweidung hier bewirken?"
              hint="Mehrere Ziele sind möglich. Tippe nur das an, was für diese Fläche wichtig ist."
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

            <div className="space-y-3 rounded-[1.2rem] border border-border bg-surface-muted p-4">
              <SectionQuestion
                title="Wie viel der Fläche soll deutlich genutzt sein?"
                hint="Ein einfacher Zielwert aus dem Pflegeplan. 100 % ist bei gewünschter Strukturvielfalt oft zu gleichmäßig."
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

            <FlowPrimaryAction onClick={goNext} disabled={goals.length === 0}>
              Weiter
            </FlowPrimaryAction>
          </div>
        ) : null}

        {step === 'plants' ? (
          <div className="space-y-4">
            <SectionQuestion
              title="Gibt es Pflanzen, die hier besonders geschont werden sollen?"
              hint="Der Pflegeplan sollte idealerweise nur wenige wichtige Arten nennen. Namen eintragen – die Bildhilfe kann später direkt geöffnet werden."
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
                Keine Zielpflanze eingetragen. Das ist in Ordnung, wenn im Vertrag keine bestimmte Art geschützt werden muss.
              </p>
            )}

            <FlowPrimaryAction onClick={goNext}>Zum kurzen Flächencheck</FlowPrimaryAction>
          </div>
        ) : null}

        {step === 'observe' ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-ink-strong">Jetzt nur hinschauen</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                Keine Fachbegriffe nötig. Wähle jeweils das Bild im Kopf, das der Fläche am nächsten kommt.
              </p>
            </div>

            <div className="space-y-3">
              <SectionQuestion title={`1. Wie stark wurde abgefressen? (Ziel: etwa ${targetUse} % der Fläche)`} />
              <FlowOptionGrid>
                <ObservationChoice value="too_low" current={use} onSelect={setUse} title="Viel bleibt stehen" hint="Große Teile sind kaum genutzt." />
                <ObservationChoice value="fits" current={use} onSelect={setUse} title="Passt zum Ziel" hint="Deutlich genutzt, aber nicht fast kahl." />
                <ObservationChoice value="too_high" current={use} onSelect={setUse} title="Fast kahl" hint="Sehr kurz oder großflächig abgefressen." />
              </FlowOptionGrid>
            </div>

            <div className="space-y-3">
              <SectionQuestion title="2. Wie sieht der Boden aus?" hint="Hier geht es um Hufspuren, kahle Stellen, Schlamm und Erosion." />
              <FlowOptionGrid>
                <ObservationChoice value="low" current={traffic} onSelect={setTraffic} title="Kaum auffällig" hint="Einzelne Hufspuren, Pflanzen stehen noch." />
                <ObservationChoice value="spotty" current={traffic} onSelect={setTraffic} title="Punktuell offen" hint="Kleine Stellen mit sichtbarer Erde." />
                <ObservationChoice value="strong" current={traffic} onSelect={setTraffic} title="Deutlich zu stark" hint="Groß kahl, tiefe Spuren, Schlamm oder Erosion." />
              </FlowOptionGrid>
            </div>

            <div className="space-y-3">
              <SectionQuestion title="3. Sammeln sich Tiere immer wieder an einer kleinen Stelle?" hint="Zum Beispiel bei Tränke, Salz, Schatten oder Nachtlager." />
              <FlowOptionGrid>
                <ObservationChoice value="none" current={nutrients} onSelect={setNutrients} title="Nein" hint="Keine auffällige Konzentration." />
                <ObservationChoice value="localized" current={nutrients} onSelect={setNutrients} title="Etwas" hint="Ein klarer Lieblingsplatz ist erkennbar." />
                <ObservationChoice value="strong" current={nutrients} onSelect={setNutrients} title="Sehr stark" hint="Viel Kot/Urin oder lange Aufenthalte auf kleiner Fläche." />
              </FlowOptionGrid>
            </div>

            {needsScrubCheck ? (
              <div className="space-y-3">
                <SectionQuestion title="4. Werden junge Sträucher und Bäume wie geplant gefressen?" />
                <FlowOptionGrid>
                  <ObservationChoice value="too_low" current={scrub} onSelect={setScrub} title="Zu wenig" hint="Viele Triebe bleiben unberührt." />
                  <ObservationChoice value="fits" current={scrub} onSelect={setScrub} title="Passt" hint="Schösslinge werden sichtbar genutzt." />
                  <ObservationChoice value="too_high" current={scrub} onSelect={setScrub} title="Zu stark" hint="Auch zu schonende Gehölze werden stark verbissen." />
                </FlowOptionGrid>
              </div>
            ) : null}

            {needsPlantCheck ? (
              <div className="space-y-3">
                <SectionQuestion title={`${needsScrubCheck ? '5' : '4'}. Werden wichtige Pflanzen geschädigt?`} hint="Bei Unsicherheit lieber gelb wählen und nachsehen." />
                <FlowOptionGrid>
                  <ObservationChoice value="none" current={protectedPlants} onSelect={setProtectedPlants} title="Nein" hint="Keine sichtbare Schädigung." />
                  <ObservationChoice value="unsure" current={protectedPlants} onSelect={setProtectedPlants} title="Unsicher" hint="Ich kann es nicht sicher beurteilen." />
                  <ObservationChoice value="damaged" current={protectedPlants} onSelect={setProtectedPlants} title="Ja" hint="Zielpflanzen werden sichtbar gefressen oder niedergetreten." />
                </FlowOptionGrid>
              </div>
            ) : null}

            <FlowPrimaryAction onClick={goNext}>Ampel anzeigen</FlowPrimaryAction>
          </div>
        ) : null}

        {step === 'result' ? (
          <div className="space-y-4">
            <ResultPanel result={result} />

            <div className="rounded-[1.2rem] border border-border bg-surface-raised p-4 text-sm">
              <h3 className="font-semibold text-ink-strong">Dein Zielprofil</h3>
              <p className="mt-1 text-ink-muted">
                {habitatOptions.find((item) => item.id === habitatType)?.label} · etwa {targetUse} % deutlich genutzt
              </p>
              <ul className="mt-2 space-y-1 text-ink-muted">
                {goals.map((goalId) => (
                  <li key={goalId}>• {careGoalOptions.find((goal) => goal.id === goalId)?.label}</li>
                ))}
              </ul>
            </div>

            <FlowSecondaryAction onClick={() => setStep('observe')}>
              Beobachtung korrigieren
            </FlowSecondaryAction>
            <FlowPrimaryAction onClick={reset}>
              <RotateCcw aria-hidden="true" className="mr-2 inline h-5 w-5" />
              Neuer Pflegecheck
            </FlowPrimaryAction>
          </div>
        ) : null}
      </Card>

      <CareInfoGuide />
    </div>
  )
}
