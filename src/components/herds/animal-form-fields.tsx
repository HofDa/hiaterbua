'use client'

import { FormField, FormLabel, FormInput, FormSelect, FormTextarea } from '@/components/ui/form'
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
      <FormField>
        <FormLabel>Ohrmarke</FormLabel>
        <FormInput
          value={earTag}
          onChange={(event) => onEarTagChange(event.target.value)}
          placeholder={earTagPlaceholder}
        />
      </FormField>

      <FormField>
        <FormLabel>Tierart</FormLabel>
        <FormSelect
          value={species}
          onChange={(event) => onSpeciesChange(event.target.value as Species)}
        >
          {speciesOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FormSelect>
      </FormField>

      <FormField>
        <FormLabel>Name (optional)</FormLabel>
        <FormInput
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={namePlaceholder}
        />
      </FormField>

      <FormField>
        <FormLabel>Notiz</FormLabel>
        <FormTextarea
          rows={3}
          value={notes}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => onNotesChange(event.target.value)}
          placeholder={notesPlaceholder}
        />
      </FormField>
    </>
  )
}
