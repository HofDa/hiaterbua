'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField, FormLabel, FormInput, FormButton } from '@/components/ui/form'
import { ErrorAlert, StatusAlert } from '@/components/ui/alert'
import { StatCard } from '@/components/ui/stat-card'

type HerdDetailHeaderCardProps = {
  isArchived: boolean
  activeAnimalsCount: number
  effectiveHerdCount: number | null
  currentEnclosureName: string | null
  metaName: string
  metaFallbackCount: string
  metaNotes: string
  metaDirty: boolean
  metaSaving: boolean
  metaSaved: boolean
  metaError: string
  onMetaNameChange: (value: string) => void
  onMetaFallbackCountChange: (value: string) => void
  onMetaNotesChange: (value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>
  onBack: () => void
  onDelete: () => void | Promise<void>
}

export function HerdDetailHeaderCard({
  isArchived,
  activeAnimalsCount,
  effectiveHerdCount,
  currentEnclosureName,
  metaName,
  metaFallbackCount,
  metaNotes,
  metaDirty,
  metaSaving,
  metaSaved,
  metaError,
  onMetaNameChange,
  onMetaFallbackCountChange,
  onMetaNotesChange,
  onSubmit,
  onBack,
  onDelete,
}: HerdDetailHeaderCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Herde
            </CardTitle>
          </div>

          <div className="flex flex-wrap gap-2">
            <FormButton type="button" onClick={onBack} variant="secondary">
              Zurück
            </FormButton>
            <FormButton
              type="button"
              onClick={() => void onDelete()}
              variant="danger"
            >
              Herde löschen
            </FormButton>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <FormField>
            <FormLabel>Name</FormLabel>
            <FormInput
              value={metaName}
              onChange={(event) => onMetaNameChange(event.target.value)}
              className="text-2xl font-semibold tracking-[-0.02em]"
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField>
              <FormLabel>Geschätzte Anzahl (optional)</FormLabel>
              <FormInput
                type="number"
                min="0"
                value={metaFallbackCount}
                onChange={(event) => onMetaFallbackCountChange(event.target.value)}
              />
            </FormField>

            <FormField>
              <FormLabel>Notiz</FormLabel>
              <FormInput
                value={metaNotes}
                onChange={(event) => onMetaNotesChange(event.target.value)}
                placeholder="optionale Bemerkung"
              />
            </FormField>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Aktive Tiere"
              value={activeAnimalsCount || effectiveHerdCount || 0}
            />
            <StatCard
              label="Aktiver Pferch"
              value={currentEnclosureName ?? 'Keiner'}
            />
            <StatCard
              label="Status"
              value={isArchived ? 'Archiviert' : 'Aktiv'}
            />
          </div>

          {metaDirty && (
            <FormButton type="submit" disabled={metaSaving} variant="primary">
              {metaSaving ? 'Speichert …' : 'Änderungen speichern'}
            </FormButton>
          )}
        </form>

        {metaSaved && (
          <StatusAlert className="mt-3">
            Herdendaten gespeichert.
          </StatusAlert>
        )}

        {metaError ? (
          <ErrorAlert className="mt-3">{metaError}</ErrorAlert>
        ) : null}
      </CardContent>
    </Card>
  )
}
