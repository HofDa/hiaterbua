'use client'

import { useEffect, useRef, useState, type FormEventHandler } from 'react'
import { WorkActivityPicker } from '@/components/work/work-activity-picker'
import {
  getDefaultWorkSelectionForSection,
  getWorkPickerSection,
  getWorkSelection,
  getWorkSelectionForOption,
  workPickerSections,
  type WorkPickerSectionId,
  type WorkSelection,
} from '@/lib/work/work-session-helpers'
import { FormField, FormLabel, FormSelect, FormTextarea, FormButton, ToggleButton } from '@/components/ui/form'
import { Alert } from '@/components/ui/alert'
import type { Enclosure, Herd, WorkActivityId, WorkType } from '@/types/domain'

const quickReminderOptions = [
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
] as const

function MobileStepHeader({
  label,
  sublabel,
  onBack,
}: {
  label: string
  sublabel: string
  onBack: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 app-callout px-3.5 py-3">
      <FormButton
        type="button"
        onClick={onBack}
        className="shrink-0 rounded-full px-3 py-1.5"
        variant="secondary"
      >
        Zurück
      </FormButton>
      <div className="min-w-0 text-right">
        <div className="text-sm font-semibold leading-tight [overflow-wrap:anywhere]">{label}</div>
        <div className="mt-0.5 text-xs font-medium leading-tight text-ink-muted [overflow-wrap:anywhere]">{sublabel}</div>
      </div>
    </div>
  )
}

function ReminderClockIcon({ minutes }: { minutes: string }) {
  const handPosition =
    minutes === '15'
      ? { x2: 16, y2: 12 }
      : minutes === '30'
        ? { x2: 12, y2: 16 }
        : minutes === '45'
          ? { x2: 8, y2: 12 }
          : { x2: 12, y2: 8 }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 fill-none stroke-current">
      <circle cx="12" cy="12" r="8.5" strokeWidth="1.8" />
      <path d="M12 7.5v4.5" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d={`M12 12 L${handPosition.x2} ${handPosition.y2}`}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="1.2" className="fill-current stroke-none" />
    </svg>
  )
}

type WorkNewSessionFormProps = {
  isSaving: boolean
  workPickerSectionId: WorkPickerSectionId
  workType: WorkType
  workActivityId: WorkActivityId | null
  selectedHerdId: string
  selectedEnclosureId: string
  reminderIntervalMin: string
  notes: string
  herds: Herd[]
  enclosures: Enclosure[]
  onSubmit: FormEventHandler<HTMLFormElement>
  onWorkPickerSectionChange: (value: WorkPickerSectionId) => void
  onWorkSelectionChange: (value: WorkSelection) => void
  onSelectedHerdIdChange: (value: string) => void
  onSelectedEnclosureIdChange: (value: string) => void
  onReminderIntervalMinChange: (value: string) => void
  onNotesChange: (value: string) => void
}

export function WorkNewSessionForm({
  isSaving,
  workPickerSectionId,
  workType,
  workActivityId,
  selectedHerdId,
  selectedEnclosureId,
  reminderIntervalMin,
  notes,
  herds,
  enclosures,
  onSubmit,
  onWorkPickerSectionChange,
  onWorkSelectionChange,
  onSelectedHerdIdChange,
  onSelectedEnclosureIdChange,
  onReminderIntervalMinChange,
  onNotesChange,
}: WorkNewSessionFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [mobileStep, setMobileStep] = useState<'section' | 'option' | 'confirm'>('section')
  const [isMobileDetailsOpen, setIsMobileDetailsOpen] = useState(false)
  const [hasStartedFlow, setHasStartedFlow] = useState(false)
  const activeSection = getWorkPickerSection(workPickerSectionId)
  const activeHerds = herds.filter((herd) => !herd.isArchived)
  const selectedOptionId = getWorkSelection({ type: workType, activityId: workActivityId }).activityId
  const selectedOption =
    activeSection.options.find((option) => option.id === selectedOptionId) ?? activeSection.options[0]

  useEffect(() => {
    if (!hasStartedFlow || typeof window === 'undefined') {
      return
    }

    if (!window.matchMedia('(max-width: 639px)').matches) {
      return
    }

    const card = formRef.current?.closest('[data-work-session-control-card="true"]')
    if (!(card instanceof HTMLElement)) {
      return
    }

    const rafId = window.requestAnimationFrame(() => {
      card.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    })

    return () => window.cancelAnimationFrame(rafId)
  }, [hasStartedFlow, isMobileDetailsOpen, mobileStep])

  function renderDetailFields() {
    return (
      <>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Herde</label>
            <div className="grid gap-3 sm:hidden">
              <div className="grid grid-cols-2 gap-3">
                <ToggleButton
                  pressed={selectedHerdId === ''}
                  onClick={() => onSelectedHerdIdChange('')}
                >
                  Keine Zuordnung
                </ToggleButton>
                {activeHerds.length === 0 ? (
                  <Alert variant="info" className="col-span-2 text-sm text-ink-muted">
                    Noch keine aktive Herde angelegt.
                  </Alert>
                ) : (
                  activeHerds.map((herd) => (
                    <ToggleButton
                      key={herd.id}
                      pressed={selectedHerdId === herd.id}
                      onClick={() => onSelectedHerdIdChange(herd.id)}
                    >
                      {herd.name}
                    </ToggleButton>
                  ))
                )}
              </div>
            </div>

            <FormSelect
              className="hidden w-full text-base shadow-sm sm:block"
              value={selectedHerdId}
              onChange={(event) => onSelectedHerdIdChange(event.target.value)}
            >
              <option value="">Keine Zuordnung</option>
              {activeHerds.map((herd) => (
                <option key={herd.id} value={herd.id}>
                  {herd.name}
                </option>
              ))}
            </FormSelect>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Pferch</label>
            <div className="grid gap-3 sm:hidden">
              <div className="grid grid-cols-2 gap-3">
                <ToggleButton
                  pressed={selectedEnclosureId === ''}
                  onClick={() => onSelectedEnclosureIdChange('')}
                >
                  Keine Zuordnung
                </ToggleButton>
                {enclosures.length === 0 ? (
                  <Alert variant="info" className="col-span-2 text-sm text-ink-muted">
                    Noch keine Pferche angelegt.
                  </Alert>
                ) : (
                  enclosures.map((enclosure) => (
                    <ToggleButton
                      key={enclosure.id}
                      pressed={selectedEnclosureId === enclosure.id}
                      onClick={() => onSelectedEnclosureIdChange(enclosure.id)}
                    >
                      {enclosure.name}
                    </ToggleButton>
                  ))
                )}
              </div>
            </div>

            <FormSelect
              className="hidden w-full text-base shadow-sm sm:block"
              value={selectedEnclosureId}
              onChange={(event) => onSelectedEnclosureIdChange(event.target.value)}
            >
              <option value="">Keine Zuordnung</option>
              {enclosures.map((enclosure) => (
                <option key={enclosure.id} value={enclosure.id}>
                  {enclosure.name}
                </option>
              ))}
            </FormSelect>
          </div>
        </div>

        <FormField>
          <FormLabel>Notiz</FormLabel>
          <FormTextarea
            rows={3}
            value={notes}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => onNotesChange(event.target.value)}
            placeholder="optionale Bemerkung zum Einsatz"
          />
        </FormField>
      </>
    )
  }

  function renderReminderButtons() {
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium text-ink">Erinnerung</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickReminderOptions.map((option) => {
            const isSelected = reminderIntervalMin === option.value

            return (
              <ToggleButton
                key={option.value}
                pressed={isSelected}
                onClick={() => onReminderIntervalMinChange(isSelected ? '0' : option.value)}
                className="min-h-[4.75rem] flex items-center justify-center gap-3 rounded-[1.3rem] sm:text-base"
              >
                <ReminderClockIcon minutes={option.value} />
                {option.label}
              </ToggleButton>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <form ref={formRef} className="mt-4 space-y-4" onSubmit={onSubmit}>
      <div className="space-y-4 sm:hidden">
        {mobileStep === 'section' ? (
          <div className="grid grid-cols-2 gap-3">
            {workPickerSections.map((section) => (
              <ToggleButton
                key={section.id}
                pressed={section.id === workPickerSectionId}
                onClick={() => {
                  setHasStartedFlow(true)
                  onWorkPickerSectionChange(section.id)
                  onWorkSelectionChange(getDefaultWorkSelectionForSection(section.id))
                  setIsMobileDetailsOpen(false)
                  setMobileStep('option')
                }}
                className="min-h-[4.5rem] rounded-[1.35rem]"
              >
                {section.label}
              </ToggleButton>
            ))}
          </div>
        ) : null}

        {mobileStep === 'option' ? (
          <>
            <MobileStepHeader
              label={activeSection.label}
              sublabel={activeSection.description}
              onBack={() => { setHasStartedFlow(true); setMobileStep('section') }}
            />

            <div className="grid grid-cols-2 gap-3">
              {activeSection.options.map((option) => (
                <ToggleButton
                  key={option.id}
                  pressed={option.id === selectedOptionId}
                  onClick={() => {
                    setHasStartedFlow(true)
                    onWorkSelectionChange(getWorkSelectionForOption(workPickerSectionId, option.id))
                    setIsMobileDetailsOpen(false)
                    setMobileStep('confirm')
                  }}
                  className="min-h-[4.75rem]"
                >
                  {option.label}
                </ToggleButton>
              ))}
            </div>
          </>
        ) : null}

        {mobileStep === 'confirm' ? (
          <>
            <MobileStepHeader
              label={activeSection.label}
              sublabel={selectedOption.label}
              onBack={() => { setHasStartedFlow(true); setMobileStep('option') }}
            />

            {renderReminderButtons()}

            <FormButton
              type="submit"
              disabled={isSaving}
              variant="primary"
              className="w-full min-h-[4.75rem] rounded-[1.35rem]"
            >
              {isSaving ? 'Startet ...' : 'Arbeitseinsatz starten'}
            </FormButton>

            <FormButton
              type="button"
              onClick={() => {
                setHasStartedFlow(true)
                setIsMobileDetailsOpen((currentValue) => !currentValue)
              }}
              variant="secondary"
              className="w-full rounded-[1.1rem]"
              aria-expanded={isMobileDetailsOpen}
            >
              {isMobileDetailsOpen ? 'Zuordnung & Details ausblenden' : 'Zuordnung & Details'}
            </FormButton>

            {isMobileDetailsOpen ? <div className="space-y-4">{renderDetailFields()}</div> : null}
          </>
        ) : null}
      </div>

      <div className="hidden space-y-4 sm:block">
        <WorkActivityPicker
          sectionId={workPickerSectionId}
          workType={workType}
          activityId={workActivityId}
          initialMobileStep="section"
          onSectionChange={onWorkPickerSectionChange}
          onSelectionChange={onWorkSelectionChange}
        />

        {renderDetailFields()}
        {renderReminderButtons()}

        <FormButton
          type="submit"
          disabled={isSaving}
          variant="primary"
          className="w-full min-h-[4.5rem] rounded-[1.3rem]"
        >
          {isSaving ? 'Startet ...' : 'Arbeitseinsatz starten'}
        </FormButton>
      </div>
    </form>
  )
}
