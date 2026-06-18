'use client'

import Link from 'next/link'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/dexie'
import { nowIso } from '@/lib/utils/time'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { FormField, FormLabel, FormInput, FormTextarea, FormButton } from '@/components/ui/form'
import { StatusAlert, ErrorAlert } from '@/components/ui/alert'
import { useAsyncOperation } from '@/hooks/use-async-operation'
import { useHerdForm } from '@/hooks/use-form-validation'
import type { Herd } from '@/types/domain'

type HerdEditRoutePageProps = {
  herdId: string | null
}

export function HerdEditRoutePage({ herdId }: HerdEditRoutePageProps) {
  const herd = useLiveQuery(() => (herdId ? db.herds.get(herdId) : undefined), [herdId])

  if (!herdId) {
    return (
      <div className="app-panel p-5">
        Herde nicht angegeben.
      </div>
    )
  }

  if (herd === undefined) {
    return (
      <div className="app-panel p-5">
        Lade Daten …
      </div>
    )
  }

  if (!herd) {
    return (
      <div className="app-panel p-5">
        Herde nicht gefunden.
      </div>
    )
  }

  return <EditHerdForm herd={herd} herdId={herdId} />
}

function EditHerdForm({ herd, herdId }: { herd: Herd; herdId: string }) {
  const { values, errors, setValue, validateAll } = useHerdForm(herd)
  const saveOperation = useAsyncOperation<boolean>()

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    
    if (!validateAll()) return

    await saveOperation.execute(
      async () => {
        await db.herds.update(herdId, {
          name: values.name.trim(),
          fallbackCount: values.fallbackCount.trim() ? Number(values.fallbackCount) : null,
          notes: values.notes.trim() || undefined,
          updatedAt: nowIso(),
        })
        return true
      },
      {
        loadingMessage: 'Speichert Änderungen...',
        successMessage: 'Änderungen gespeichert'
      }
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Herde bearbeiten</CardTitle>
          <p className="mt-2 text-sm text-ink-muted">{herd.name}</p>
        </CardHeader>
      </Card>

      <Card>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSave}>
            <FormField>
              <FormLabel>Name</FormLabel>
              <FormInput
                value={values.name}
                onChange={(event) => setValue('name', event.target.value)}
              />
              {errors.name && <ErrorAlert>{errors.name}</ErrorAlert>}
            </FormField>

            <FormField>
              <FormLabel>Geschätzte Anzahl (optional)</FormLabel>
              <FormInput
                type="number"
                min="0"
                value={values.fallbackCount}
                onChange={(event) => setValue('fallbackCount', event.target.value)}
              />
              {errors.fallbackCount && <ErrorAlert>{errors.fallbackCount}</ErrorAlert>}
            </FormField>

            <FormField>
              <FormLabel>Notiz</FormLabel>
              <FormTextarea
                rows={4}
                value={values.notes}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setValue('notes', event.target.value)}
              />
              {errors.notes && <ErrorAlert>{errors.notes}</ErrorAlert>}
            </FormField>

            {saveOperation.status && (
              <StatusAlert>{saveOperation.status}</StatusAlert>
            )}

            {saveOperation.error && (
              <ErrorAlert>{saveOperation.error}</ErrorAlert>
            )}

            <div className="flex flex-wrap gap-2">
              <FormButton
                type="submit"
                disabled={saveOperation.isLoading}
                variant="primary"
              >
                {saveOperation.isLoading ? 'Speichert …' : 'Speichern'}
              </FormButton>

              <Link
                href={`/herd?id=${encodeURIComponent(herdId)}`}
                className="rounded-2xl border border-border bg-surface-raised px-4 py-3 font-medium text-ink"
              >
                Zurück
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
