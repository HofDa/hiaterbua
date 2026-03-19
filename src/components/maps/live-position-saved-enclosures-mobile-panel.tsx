'use client'

import { useState } from 'react'
import {
  formatDateTime,
  getAssignableHerds,
  getEffectiveHerdCount,
} from '@/lib/maps/live-position-map-helpers'
import { formatArea } from '@/lib/maps/map-core'
import type { FilteredEnclosureItem } from '@/lib/maps/live-position-map-helpers'
import type {
  Animal,
  Enclosure,
  EnclosureAssignment,
  Herd,
} from '@/types/domain'

type LivePositionSavedEnclosuresMobilePanelProps = {
  filteredEnclosures: FilteredEnclosureItem[]
  selectedEnclosure: Enclosure | null
  selectedEnclosureId: string | null
  assignmentEditorEnclosureId: string | null
  assignmentHerdId: string
  assignmentCount: string
  assignmentNotes: string
  assignmentError: string
  isAssignmentSaving: boolean
  endingAssignmentId: string | null
  safeHerds: Herd[]
  herdsById: Map<string, Herd>
  animalsByHerdId: Map<string, Animal[]>
  activeAssignmentsByHerdId: Map<string, EnclosureAssignment>
  isSelectedEnclosureInfoOpen: boolean
  showSelectedTrack: boolean
  onSelectedEnclosureChange: (nextId: string) => void
  onToggleSelectedEnclosureInfo: () => void
  onToggleShowSelectedTrack: () => void
  onOpenAssignmentEditor: (enclosure: Enclosure) => void
  onCancelAssignmentEditor: () => void
  onAssignHerdToEnclosure: (enclosure: Enclosure) => void
  onAssignmentHerdIdChange: (nextHerdId: string) => void
  onAssignmentCountChange: (value: string) => void
  onAssignmentNotesChange: (value: string) => void
  onEndEnclosureAssignment: (assignment: EnclosureAssignment) => void
}

type LivePositionMobileAssignmentFlowProps = {
  enclosure: Enclosure
  assignmentHerdId: string
  assignmentCount: string
  assignmentNotes: string
  assignmentError: string
  isAssignmentSaving: boolean
  safeHerds: Herd[]
  herdsById: Map<string, Herd>
  activeAssignmentsByHerdId: Map<string, EnclosureAssignment>
  onCancelAssignmentEditor: () => void
  onAssignHerdToEnclosure: (enclosure: Enclosure) => void
  onAssignmentHerdIdChange: (nextHerdId: string) => void
  onAssignmentCountChange: (value: string) => void
  onAssignmentNotesChange: (value: string) => void
}

type LivePositionMobileActiveAssignmentCardProps = {
  activeAssignment: EnclosureAssignment
  herdsById: Map<string, Herd>
  animalsByHerdId: Map<string, Animal[]>
  endingAssignmentId: string | null
  onEndEnclosureAssignment: (assignment: EnclosureAssignment) => void
}

function LivePositionMobileAssignmentFlow({
  enclosure,
  assignmentHerdId,
  assignmentCount,
  assignmentNotes,
  assignmentError,
  isAssignmentSaving,
  safeHerds,
  herdsById,
  activeAssignmentsByHerdId,
  onCancelAssignmentEditor,
  onAssignHerdToEnclosure,
  onAssignmentHerdIdChange,
  onAssignmentCountChange,
  onAssignmentNotesChange,
}: LivePositionMobileAssignmentFlowProps) {
  const [step, setStep] = useState<'herd' | 'count' | 'confirm'>('herd')
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const assignableHerds = getAssignableHerds(safeHerds, activeAssignmentsByHerdId, enclosure.id)
  const selectedHerd =
    assignableHerds.find((herd) => herd.id === assignmentHerdId) ??
    herdsById.get(assignmentHerdId) ??
    null
  const parsedCount = Number.parseInt(assignmentCount.trim(), 10)
  const animalCount = Number.isFinite(parsedCount) ? parsedCount : 0
  const hasSelectedAssignmentHerd = assignableHerds.some((herd) => herd.id === assignmentHerdId)

  function handleBack() {
    if (step === 'confirm') {
      setStep('count')
      return
    }

    if (step === 'count') {
      setStep('herd')
      return
    }

    onCancelAssignmentEditor()
  }

  return (
    <div className="rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-[#d2cbc0] bg-[#f8f1e2] px-3.5 py-3 text-[#17130f]">
        <button
          type="button"
          onClick={handleBack}
          className="shrink-0 rounded-full border border-[#5a5347] bg-[#fffdf6] px-3 py-1.5 text-sm font-semibold text-[#17130f]"
        >
          Zurück
        </button>
        <div className="min-w-0 text-right">
          <div className="text-sm font-semibold leading-tight [overflow-wrap:anywhere]">
            {enclosure.name}
          </div>
          <div className="mt-0.5 text-xs font-medium leading-tight text-neutral-700">
            {step === 'herd'
              ? '1. Herde wählen'
              : step === 'count'
                ? '2. Tierzahl'
                : '3. Herde zuweisen'}
          </div>
        </div>
      </div>

      {step === 'herd' ? (
        <div className="mt-3 space-y-3">
          {assignableHerds.length === 0 ? (
            <div className="rounded-[1.25rem] border-2 border-dashed border-[#ccb98a] bg-[#fffdf6] px-4 py-4 text-sm text-neutral-600">
              Alle aktiven Herden sind bereits anderen Pferchen zugewiesen.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {assignableHerds.map((herd) => {
                const isSelected = assignmentHerdId === herd.id

                return (
                  <button
                    key={herd.id}
                    type="button"
                    onClick={() => {
                      onAssignmentHerdIdChange(herd.id)
                      setStep('count')
                    }}
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
              })}
            </div>
          )}
        </div>
      ) : null}

      {step === 'count' ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-[1.2rem] border border-[#d2cbc0] bg-[#f8f1e2] px-3.5 py-3 text-right text-[#17130f]">
            <div className="text-sm font-semibold leading-tight [overflow-wrap:anywhere]">
              {selectedHerd?.name ?? 'Herde wählen'}
            </div>
            <div className="mt-0.5 text-xs font-medium leading-tight text-neutral-700">
              Tiere im Pferch
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 rounded-[1.35rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-4 text-center shadow-[0_12px_24px_rgba(40,34,26,0.08)]">
              <div className="text-xs font-medium uppercase tracking-[0.08em] text-neutral-600">
                Tiere
              </div>
              <div className="mt-2 text-4xl font-semibold text-neutral-950">{animalCount}</div>
            </div>

            <button
              type="button"
              onClick={() => onAssignmentCountChange(String(Math.max(0, animalCount - 1)))}
              disabled={animalCount <= 0}
              className="min-h-[4.75rem] rounded-[1.3rem] border-2 border-[#5a5347] bg-[#f1efeb] px-4 py-4 text-3xl font-semibold text-[#17130f] shadow-[0_12px_24px_rgba(40,34,26,0.08)] disabled:opacity-40"
            >
              -
            </button>
            <button
              type="button"
              onClick={() => onAssignmentCountChange(String(animalCount + 1))}
              className="min-h-[4.75rem] rounded-[1.3rem] border-2 border-[#5a5347] bg-[#f1efeb] px-4 py-4 text-3xl font-semibold text-[#17130f] shadow-[0_12px_24px_rgba(40,34,26,0.08)]"
            >
              +
            </button>

            <button
              type="button"
              onClick={() => setStep('confirm')}
              disabled={!hasSelectedAssignmentHerd}
              className="col-span-2 rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-4 py-3 text-sm font-medium text-[#17130f] disabled:opacity-50"
            >
              Weiter
            </button>
          </div>
        </div>
      ) : null}

      {step === 'confirm' ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-[1.2rem] border border-[#d2cbc0] bg-[#f8f1e2] px-3.5 py-3 text-right text-[#17130f]">
            <div className="text-sm font-semibold leading-tight [overflow-wrap:anywhere]">
              {selectedHerd?.name ?? 'Herde wählen'}
            </div>
            <div className="mt-0.5 text-xs font-medium leading-tight text-neutral-700">
              {animalCount} Tiere bereit
            </div>
          </div>

          <button
            type="button"
            onClick={() => onAssignHerdToEnclosure(enclosure)}
            disabled={isAssignmentSaving || !hasSelectedAssignmentHerd}
            className="w-full min-h-[4.75rem] rounded-[1.35rem] border-2 border-[#5a5347] bg-[linear-gradient(180deg,#f6f2e9,#ece3cf)] px-4 py-4 text-lg font-semibold text-[#17130f] shadow-[0_16px_32px_rgba(40,34,26,0.14)] disabled:opacity-50"
          >
            {isAssignmentSaving ? 'Speichert ...' : 'Herde zuweisen'}
          </button>

          <button
            type="button"
            onClick={() => setIsDetailsOpen((current) => !current)}
            aria-expanded={isDetailsOpen}
            className="w-full rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-neutral-950"
          >
            {isDetailsOpen ? 'Details ausblenden' : 'Details'}
          </button>

          {isDetailsOpen ? (
            <div>
              <label className="mb-1 block text-sm font-medium">Notiz</label>
              <textarea
                className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
                rows={3}
                value={assignmentNotes}
                onChange={(event) => onAssignmentNotesChange(event.target.value)}
                placeholder="optionale Bemerkung zur Belegung"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {assignmentError ? (
        <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {assignmentError}
        </div>
      ) : null}
    </div>
  )
}

function LivePositionMobileActiveAssignmentCard({
  activeAssignment,
  herdsById,
  animalsByHerdId,
  endingAssignmentId,
  onEndEnclosureAssignment,
}: LivePositionMobileActiveAssignmentCardProps) {
  const activeHerd = herdsById.get(activeAssignment.herdId)
  const effectiveCount =
    activeAssignment.count ??
    getEffectiveHerdCount(activeHerd, animalsByHerdId.get(activeAssignment.herdId) ?? [])

  return (
    <div className="mt-4 rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
        Belegung
      </div>
      <div className="mt-1 text-sm font-semibold text-neutral-950">
        {activeHerd?.name ?? 'Unbekannte Herde'}
      </div>
      <div className="mt-2 text-sm text-neutral-700">
        Seit {formatDateTime(activeAssignment.startTime)}
      </div>
      <div className="mt-1 text-sm text-neutral-700">
        Besatz {effectiveCount ?? 'unbekannt'}
      </div>
      {activeAssignment.notes ? (
        <div className="mt-1 text-sm text-neutral-700">{activeAssignment.notes}</div>
      ) : null}
      <button
        type="button"
        onClick={() => onEndEnclosureAssignment(activeAssignment)}
        disabled={endingAssignmentId === activeAssignment.id}
        className="mt-3 w-full rounded-2xl border border-[#d97706] bg-[#fff1e3] px-4 py-3 text-sm font-semibold text-[#b45309] disabled:opacity-50"
      >
        {endingAssignmentId === activeAssignment.id ? 'Weist aus ...' : 'Herde ausweisen'}
      </button>
    </div>
  )
}

export function LivePositionSavedEnclosuresMobilePanel({
  filteredEnclosures,
  selectedEnclosure,
  selectedEnclosureId,
  assignmentEditorEnclosureId,
  assignmentHerdId,
  assignmentCount,
  assignmentNotes,
  assignmentError,
  isAssignmentSaving,
  endingAssignmentId,
  safeHerds,
  herdsById,
  animalsByHerdId,
  activeAssignmentsByHerdId,
  isSelectedEnclosureInfoOpen,
  showSelectedTrack,
  onSelectedEnclosureChange,
  onToggleSelectedEnclosureInfo,
  onToggleShowSelectedTrack,
  onOpenAssignmentEditor,
  onCancelAssignmentEditor,
  onAssignHerdToEnclosure,
  onAssignmentHerdIdChange,
  onAssignmentCountChange,
  onAssignmentNotesChange,
  onEndEnclosureAssignment,
}: LivePositionSavedEnclosuresMobilePanelProps) {
  const detailEnclosureId = selectedEnclosureId ?? assignmentEditorEnclosureId
  const detailItem =
    filteredEnclosures.find(({ enclosure }) => enclosure.id === detailEnclosureId) ?? null
  const detailEnclosure = selectedEnclosure ?? detailItem?.enclosure ?? null
  const isAssignmentFlowOpen =
    Boolean(assignmentEditorEnclosureId) &&
    detailItem?.enclosure.id === assignmentEditorEnclosureId

  return (
    <div className="rounded-[1.4rem] border-2 border-[#3a342a] bg-[#fff8ea] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Gespeicherte Pferche</h2>
        <span className="text-sm text-neutral-500">{filteredEnclosures.length}</span>
      </div>

      {isAssignmentFlowOpen && detailItem ? (
        <div className="mt-4">
          <LivePositionMobileAssignmentFlow
            key={detailItem.enclosure.id}
            enclosure={detailItem.enclosure}
            assignmentHerdId={assignmentHerdId}
            assignmentCount={assignmentCount}
            assignmentNotes={assignmentNotes}
            assignmentError={assignmentError}
            isAssignmentSaving={isAssignmentSaving}
            safeHerds={safeHerds}
            herdsById={herdsById}
            activeAssignmentsByHerdId={activeAssignmentsByHerdId}
            onCancelAssignmentEditor={onCancelAssignmentEditor}
            onAssignHerdToEnclosure={onAssignHerdToEnclosure}
            onAssignmentHerdIdChange={onAssignmentHerdIdChange}
            onAssignmentCountChange={onAssignmentCountChange}
            onAssignmentNotesChange={onAssignmentNotesChange}
          />
        </div>
      ) : (
        <div className="mt-4 max-h-[48vh] overflow-y-auto pr-1 overscroll-contain">
          <div className="flex flex-wrap gap-3">
            {filteredEnclosures.map(({ enclosure, activeAssignment }) => {
              const isActive = Boolean(activeAssignment)
              const isSelected = selectedEnclosureId === enclosure.id
              const hasAssignableHerds =
                getAssignableHerds(safeHerds, activeAssignmentsByHerdId, enclosure.id).length > 0

              return (
                <div
                  key={enclosure.id}
                  className={[
                    'min-w-[45%] flex-1 rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] p-3 shadow-sm',
                    isSelected ? 'border-[#5a5347] bg-[#efe4c8]' : '',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        assignmentEditorEnclosureId &&
                        assignmentEditorEnclosureId !== enclosure.id
                      ) {
                        onCancelAssignmentEditor()
                      }
                      onSelectedEnclosureChange(enclosure.id)
                    }}
                    className="flex w-full items-center justify-between text-left text-sm font-semibold text-neutral-900"
                  >
                    <span className="truncate">{enclosure.name}</span>
                    <span className="text-xs text-neutral-500">
                      {isActive ? 'aktiv' : 'frei'}
                    </span>
                  </button>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => activeAssignment && onEndEnclosureAssignment(activeAssignment)}
                        className="flex-1 rounded-2xl border border-[#d97706] bg-[#fff1e3] px-3 py-2 text-xs font-semibold text-[#b45309]"
                      >
                        Herde ausweisen
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectedEnclosureChange(enclosure.id)
                          onOpenAssignmentEditor(enclosure)
                        }}
                        disabled={!hasAssignableHerds}
                        className="flex-1 rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-3 py-2 text-xs font-semibold text-[#17130f] disabled:opacity-50"
                      >
                        {hasAssignableHerds ? 'Herde zuweisen' : 'Keine Herde frei'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {filteredEnclosures.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-600">
          Für diesen Filter gibt es aktuell keine Pferche.
        </p>
      ) : null}

      {detailEnclosure && !isAssignmentFlowOpen ? (
        <>
          <div className="mt-4 rounded-2xl border border-[#d2cbc0] bg-[#efe4c8] px-4 py-3 text-sm text-[#17130f]">
            <button
              type="button"
              onClick={onToggleSelectedEnclosureInfo}
              aria-expanded={isSelectedEnclosureInfoOpen}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="min-w-0 break-words">
                Fokus: <span className="font-medium">{detailEnclosure.name}</span>
              </span>
              <span className="shrink-0 text-base text-[#17130f]">
                {isSelectedEnclosureInfoOpen ? '−' : '+'}
              </span>
            </button>
            {isSelectedEnclosureInfoOpen ? (
              <>
                <div className="mt-2">
                  {formatArea(detailEnclosure.areaM2)} · {detailEnclosure.pointsCount ?? 0} Punkte
                </div>
                {detailEnclosure.notes ? (
                  <div className="mt-1 text-[#4f473c]">{detailEnclosure.notes}</div>
                ) : null}
              </>
            ) : null}
          </div>

          {detailItem?.activeAssignment ? (
            <LivePositionMobileActiveAssignmentCard
              activeAssignment={detailItem.activeAssignment}
              herdsById={herdsById}
              animalsByHerdId={animalsByHerdId}
              endingAssignmentId={endingAssignmentId}
              onEndEnclosureAssignment={onEndEnclosureAssignment}
            />
          ) : null}
        </>
      ) : null}

      {detailEnclosure?.method === 'walk' ? (
        <button
          type="button"
          onClick={onToggleShowSelectedTrack}
          className="mt-4 w-full rounded-2xl bg-[#fffdf6] px-4 py-3 text-sm font-medium text-neutral-900"
        >
          {showSelectedTrack ? 'Spur ausblenden' : 'Spur anzeigen'}
        </button>
      ) : null}
    </div>
  )
}
