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
import type { Enclosure, Herd, WorkActivityId, WorkType } from '@/types/domain'

const quickReminderOptions = [
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
] as const

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
  const activeEnclosures = enclosures
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
                <button
                  type="button"
                  onClick={() => onSelectedHerdIdChange('')}
                  aria-pressed={selectedHerdId === ''}
                  className={[
                    'min-h-[4.25rem] rounded-[1.25rem] border-2 px-4 py-3.5 text-left text-sm font-semibold leading-tight whitespace-normal shadow-[0_12px_24px_rgba(40,34,26,0.08)] transition-colors',
                    selectedHerdId === ''
                      ? 'border-[#5a5347] bg-[#efe4c8] text-[#17130f]'
                      : 'border-[#ccb98a] bg-[#fffdf6] text-neutral-900',
                  ].join(' ')}
                >
                  <span className="block [overflow-wrap:anywhere]">Keine Zuordnung</span>
                </button>
                {activeHerds.length === 0 ? (
                  <div className="col-span-2 rounded-[1.25rem] border-2 border-dashed border-[#ccb98a] bg-[#fffdf6] px-4 py-4 text-sm text-neutral-600">
                    Noch keine aktive Herde angelegt.
                  </div>
                ) : (
                  activeHerds.map((herd) => {
                    const isSelected = selectedHerdId === herd.id

                    return (
                      <button
                        key={herd.id}
                        type="button"
                        onClick={() => onSelectedHerdIdChange(herd.id)}
                        aria-pressed={isSelected}
                        className={[
                          'min-h-[4.25rem] rounded-[1.25rem] border-2 px-4 py-3.5 text-left text-sm font-semibold leading-tight whitespace-normal shadow-[0_12px_24px_rgba(40,34,26,0.08)] transition-colors',
                          isSelected
                            ? 'border-[#5a5347] bg-[#efe4c8] text-[#17130f]'
                            : 'border-[#ccb98a] bg-[#fffdf6] text-neutral-900',
                        ].join(' ')}
                      >
                        <span className="block [overflow-wrap:anywhere]">{herd.name}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <select
              className="hidden w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm sm:block"
              value={selectedHerdId}
              onChange={(event) => onSelectedHerdIdChange(event.target.value)}
            >
              <option value="">Keine Zuordnung</option>
              {activeHerds.map((herd) => (
                <option key={herd.id} value={herd.id}>
                  {herd.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Pferch</label>
            <div className="grid gap-3 sm:hidden">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onSelectedEnclosureIdChange('')}
                  aria-pressed={selectedEnclosureId === ''}
                  className={[
                    'min-h-[4.25rem] rounded-[1.25rem] border-2 px-4 py-3.5 text-left text-sm font-semibold leading-tight whitespace-normal shadow-[0_12px_24px_rgba(40,34,26,0.08)] transition-colors',
                    selectedEnclosureId === ''
                      ? 'border-[#5a5347] bg-[#efe4c8] text-[#17130f]'
                      : 'border-[#ccb98a] bg-[#fffdf6] text-neutral-900',
                  ].join(' ')}
                >
                  <span className="block [overflow-wrap:anywhere]">Keine Zuordnung</span>
                </button>
                {activeEnclosures.length === 0 ? (
                  <div className="col-span-2 rounded-[1.25rem] border-2 border-dashed border-[#ccb98a] bg-[#fffdf6] px-4 py-4 text-sm text-neutral-600">
                    Noch keine Pferche angelegt.
                  </div>
                ) : (
                  activeEnclosures.map((enclosure) => {
                    const isSelected = selectedEnclosureId === enclosure.id

                    return (
                      <button
                        key={enclosure.id}
                        type="button"
                        onClick={() => onSelectedEnclosureIdChange(enclosure.id)}
                        aria-pressed={isSelected}
                        className={[
                          'min-h-[4.25rem] rounded-[1.25rem] border-2 px-4 py-3.5 text-left text-sm font-semibold leading-tight whitespace-normal shadow-[0_12px_24px_rgba(40,34,26,0.08)] transition-colors',
                          isSelected
                            ? 'border-[#5a5347] bg-[#efe4c8] text-[#17130f]'
                            : 'border-[#ccb98a] bg-[#fffdf6] text-neutral-900',
                        ].join(' ')}
                      >
                        <span className="block [overflow-wrap:anywhere]">{enclosure.name}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <select
              className="hidden w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm sm:block"
              value={selectedEnclosureId}
              onChange={(event) => onSelectedEnclosureIdChange(event.target.value)}
            >
              <option value="">Keine Zuordnung</option>
              {activeEnclosures.map((enclosure) => (
                <option key={enclosure.id} value={enclosure.id}>
                  {enclosure.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Notiz</label>
          <textarea
            className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
            rows={3}
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="optionale Bemerkung zum Einsatz"
          />
        </div>
      </>
    )
  }

  function renderReminderButtons() {
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium text-[#17130f]">Erinnerung</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickReminderOptions.map((option) => {
            const isSelected = reminderIntervalMin === option.value

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onReminderIntervalMinChange(isSelected ? '0' : option.value)}
                aria-pressed={isSelected}
                className={[
                  'flex min-h-[4.75rem] items-center justify-center gap-3 rounded-[1.3rem] border-2 px-4 py-3 text-sm font-semibold leading-tight whitespace-normal shadow-[0_12px_24px_rgba(40,34,26,0.08)] transition-colors sm:text-base',
                  isSelected
                    ? 'border-[#5a5347] bg-[#efe4c8] text-[#17130f]'
                    : 'border-[#ccb98a] bg-[#fffdf6] text-neutral-900',
                ].join(' ')}
              >
                <ReminderClockIcon minutes={option.value} />
                <span className="block [overflow-wrap:anywhere]">{option.label}</span>
              </button>
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
            {workPickerSections.map((section) => {
              const isActive = section.id === workPickerSectionId

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    setHasStartedFlow(true)
                    onWorkPickerSectionChange(section.id)
                    onWorkSelectionChange(getDefaultWorkSelectionForSection(section.id))
                    setIsMobileDetailsOpen(false)
                    setMobileStep('option')
                  }}
                  className={[
                    'min-h-[4.5rem] rounded-[1.35rem] border-2 px-4 py-4 text-left text-sm font-semibold leading-tight whitespace-normal shadow-[0_12px_24px_rgba(40,34,26,0.08)] transition-colors',
                    isActive
                      ? 'border-[#3a342a] bg-[#efe4c8] text-[#17130f]'
                      : 'border-[#ccb98a] bg-[#fffdf6] text-neutral-900',
                  ].join(' ')}
                  aria-pressed={isActive}
                >
                  <span className="block [overflow-wrap:anywhere]">{section.label}</span>
                </button>
              )
            })}
          </div>
        ) : null}

        {mobileStep === 'option' ? (
          <>
            <div className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-[#d2cbc0] bg-[#f8f1e2] px-3.5 py-3 text-[#17130f]">
              <button
                type="button"
                onClick={() => {
                  setHasStartedFlow(true)
                  setMobileStep('section')
                }}
                className="shrink-0 rounded-full border border-[#5a5347] bg-[#fffdf6] px-3 py-1.5 text-sm font-semibold text-[#17130f]"
              >
                Zurück
              </button>
              <div className="min-w-0 text-right">
                <div className="text-sm font-semibold leading-tight [overflow-wrap:anywhere]">
                  {activeSection.label}
                </div>
                <div className="mt-0.5 text-xs font-medium leading-tight text-neutral-700 [overflow-wrap:anywhere]">
                  {activeSection.description}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {activeSection.options.map((option) => {
                const isActive = option.id === selectedOptionId

                return (
                  <button
                    key={option.id}
                  type="button"
                  onClick={() => {
                      setHasStartedFlow(true)
                      onWorkSelectionChange(getWorkSelectionForOption(workPickerSectionId, option.id))
                      setIsMobileDetailsOpen(false)
                      setMobileStep('confirm')
                    }}
                    className={[
                      'min-h-[4.75rem] rounded-[1.25rem] border-2 px-4 py-4 text-left text-sm font-semibold leading-tight whitespace-normal shadow-[0_12px_24px_rgba(40,34,26,0.08)] transition-colors',
                      isActive
                        ? 'border-[#3a342a] bg-[#efe4c8] text-[#17130f]'
                        : 'border-[#ccb98a] bg-[#fffdf6] text-neutral-900',
                    ].join(' ')}
                    aria-pressed={isActive}
                  >
                    <span className="block [overflow-wrap:anywhere]">{option.label}</span>
                  </button>
                )
              })}
            </div>
          </>
        ) : null}

        {mobileStep === 'confirm' ? (
          <>
            <div className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-[#d2cbc0] bg-[#f8f1e2] px-3.5 py-3 text-[#17130f]">
              <button
                type="button"
                onClick={() => {
                  setHasStartedFlow(true)
                  setMobileStep('option')
                }}
                className="shrink-0 rounded-full border border-[#5a5347] bg-[#fffdf6] px-3 py-1.5 text-sm font-semibold text-[#17130f]"
              >
                Zurück
              </button>
              <div className="min-w-0 text-right">
                <div className="text-sm font-semibold leading-tight [overflow-wrap:anywhere]">
                  {activeSection.label}
                </div>
                <div className="mt-0.5 text-xs font-medium leading-tight text-neutral-700 [overflow-wrap:anywhere]">
                  {selectedOption.label}
                </div>
              </div>
            </div>

            {renderReminderButtons()}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full min-h-[4.75rem] rounded-[1.35rem] border-2 border-[#5a5347] bg-[linear-gradient(180deg,#f6f2e9,#ece3cf)] px-4 py-4 text-lg font-semibold text-[#17130f] shadow-[0_16px_32px_rgba(40,34,26,0.14)] disabled:opacity-50"
            >
              {isSaving ? 'Startet ...' : 'Arbeitseinsatz starten'}
            </button>

            <button
              type="button"
              onClick={() => {
                setHasStartedFlow(true)
                setIsMobileDetailsOpen((currentValue) => !currentValue)
              }}
              className="w-full rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-neutral-950"
              aria-expanded={isMobileDetailsOpen}
            >
              {isMobileDetailsOpen ? 'Zuordnung & Details ausblenden' : 'Zuordnung & Details'}
            </button>

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

        <button
          type="submit"
          disabled={isSaving}
          className="w-full min-h-[4.5rem] rounded-[1.3rem] border-2 border-[#5a5347] bg-[linear-gradient(180deg,#f6f2e9,#ece3cf)] px-4 py-4 text-lg font-semibold text-[#17130f] shadow-[0_16px_32px_rgba(40,34,26,0.14)] disabled:opacity-50"
        >
          {isSaving ? 'Startet ...' : 'Arbeitseinsatz starten'}
        </button>
      </div>
    </form>
  )
}
