'use client'

import { EarTagScanPanel } from '@/components/animals/ear-tag-scan-panel'
import type { Species } from '@/types/domain'

export const speciesOptions: { value: Species; label: string }[] = [
  { value: 'cattle', label: 'Rinder' },
  { value: 'sheep', label: 'Schafe' },
  { value: 'goats', label: 'Ziegen' },
  { value: 'horses', label: 'Pferde' },
  { value: 'other', label: 'Andere' },
]

type AnimalFormFieldsProps = {
  disabled?: boolean
  earTag: string
  onEarTagChange: (value: string) => void
  knownEarTags: string[]
  conflictIgnoreEarTag?: string | null
  species: Species
  onSpeciesChange: (value: Species) => void
  name: string
  onNameChange: (value: string) => void
  notes: string
  onNotesChange: (value: string) => void
  earTagPlaceholder?: string
  namePlaceholder?: string
  notesPlaceholder?: string
}

export function AnimalFormFields({
  disabled = false,
  earTag,
  onEarTagChange,
  knownEarTags,
  conflictIgnoreEarTag = null,
  species,
  onSpeciesChange,
  name,
  onNameChange,
  notes,
  onNotesChange,
  earTagPlaceholder = 'z. B. IT021000123456',
  namePlaceholder = 'optional',
  notesPlaceholder = 'Bemerkungen zum Tier',
}: AnimalFormFieldsProps) {
  return (
    <>
      <EarTagScanPanel
        disabled={disabled}
        knownEarTags={knownEarTags}
        conflictIgnoreEarTag={conflictIgnoreEarTag}
        value={earTag}
        onApplyValue={onEarTagChange}
      />

      <div>
        <label className="mb-1 block text-sm font-medium">Ohrmarke</label>
        <input
          className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
          value={earTag}
          onChange={(event) => onEarTagChange(event.target.value)}
          placeholder={earTagPlaceholder}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Tierart</label>
        <select
          className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
          value={species}
          onChange={(event) => onSpeciesChange(event.target.value as Species)}
        >
          {speciesOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Name (optional)</label>
        <input
          className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={namePlaceholder}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Notiz</label>
        <textarea
          className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
          rows={3}
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder={notesPlaceholder}
        />
      </div>
    </>
  )
}
