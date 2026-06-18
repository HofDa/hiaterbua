'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { db } from '@/lib/db/dexie'
import {
  ACCESS_SESSION_DURATION_MINUTES,
  authorizeAccess,
  clearAccessAuthorization,
  isAccessAuthorized,
  isAllowedAccessPassword,
  subscribeToAccessState,
} from '@/lib/security/app-access'
import { defaultAppSettings } from '@/lib/settings/defaults'
import {
  normalizeSettingsValue,
  readFallbackSettings,
  withTimeout,
  writeFallbackSettings,
} from '@/lib/settings/page-helpers'
import type { AppSettings } from '@/types/domain'
import { Card } from '@/components/ui/card'
import { FormInput, FormButton } from '@/components/ui/form'
import { Alert } from '@/components/ui/alert'
import { cn } from '@/lib/utils/cn'

function UserBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current">
      <circle cx="12" cy="8" r="3.25" strokeWidth="1.8" />
      <path d="M5.5 18.25c1.1-3 3.57-4.5 6.5-4.5s5.4 1.5 6.5 4.5" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
      {children}
    </div>
  )
}

function ExpandToggle({
  isExpanded,
  onToggle,
}: {
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-surface-muted text-base font-semibold text-ink sm:h-10 sm:w-10 sm:text-lg"
      aria-expanded={isExpanded}
      aria-label={isExpanded ? 'Benutzerkarte einklappen' : 'Benutzerkarte aufklappen'}
    >
      {isExpanded ? '-' : '+'}
    </button>
  )
}

function ReadonlyField({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('min-h-[3rem] rounded-[1rem] border-2 border-border bg-surface-raised px-3.5 py-2.5 text-sm font-medium text-ink shadow-sm sm:min-h-[3.5rem] sm:rounded-[1.1rem] sm:px-4 sm:py-3 sm:text-base', className)}>
      {children}
    </div>
  )
}

function InlineAlert({ variant, children }: { variant: 'error' | 'success' | 'warning' | 'info'; children: React.ReactNode }) {
  const styles = {
    error: 'border-error-border bg-error-surface text-error-ink font-medium',
    success: 'border-success-border bg-success-surface text-success-ink font-semibold',
    warning: 'border-warning-border bg-warning-surface text-warning-ink font-medium',
    info: 'border-border-soft bg-surface-warm text-ink',
  }

  return (
    <Alert className={`mt-3 rounded-[1rem] px-3.5 py-2.5 text-sm sm:mt-4 sm:px-4 sm:py-3 ${styles[variant]}`}>
      {children}
    </Alert>
  )
}

export function WorkUserCard() {
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings)
  const [draftUserName, setDraftUserName] = useState(defaultAppSettings.userName)
  const [draftAccessPassword, setDraftAccessPassword] = useState('')
  const [isReady, setIsReady] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [isEditing, setIsEditing] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [validationMessage, setValidationMessage] = useState('')
  const [accessMessage, setAccessMessage] = useState('')
  const [accessValidationMessage, setAccessValidationMessage] = useState('')
  const isAccessApproved = useSyncExternalStore(
    subscribeToAccessState,
    isAccessAuthorized,
    () => false
  )

  function applySettings(nextSettings: AppSettings) {
    const isEmpty = nextSettings.userName.trim().length === 0
    setSettings(nextSettings)
    setDraftUserName(nextSettings.userName)
    setIsEditing(isEmpty)
    setIsExpanded(isEmpty)
  }

  useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      const fallbackSettings = readFallbackSettings()

      if (fallbackSettings && !cancelled) {
        applySettings(fallbackSettings)
      }

      try {
        const storedSettings = await withTimeout(db.settings.get('app'))

        if (cancelled) return

        const nextSettings = normalizeSettingsValue(
          storedSettings ?? fallbackSettings ?? defaultAppSettings
        )

        if (!storedSettings) {
          try {
            await withTimeout(db.settings.put(nextSettings))
          } catch {
            // Fallback storage stays available through local settings backup.
          }
        }

        applySettings(nextSettings)
        writeFallbackSettings(nextSettings)
      } catch {
        if (cancelled) return

        const nextSettings = normalizeSettingsValue(fallbackSettings ?? defaultAppSettings)
        applySettings(nextSettings)
        writeFallbackSettings(nextSettings)
      } finally {
        if (!cancelled) setIsReady(true)
      }
    }

    void loadSettings()

    return () => {
      cancelled = true
    }
  }, [])

  async function saveUserName() {
    const trimmedUserName = draftUserName.trim()

    if (!trimmedUserName) {
      setValidationMessage('Bitte einen Benutzernamen eingeben.')
      return
    }

    setIsSaving(true)
    setStatusMessage('')
    setValidationMessage('')

    const nextSettings = normalizeSettingsValue({
      ...settings,
      userName: trimmedUserName,
    })

    try {
      await withTimeout(db.settings.put(nextSettings))
      setStatusMessage('Benutzername gespeichert.')
    } catch {
      setStatusMessage('Benutzername gespeichert.')
    } finally {
      writeFallbackSettings(nextSettings)
      setSettings(nextSettings)
      setDraftUserName(nextSettings.userName)
      setIsEditing(false)
      setIsExpanded(false)
      setIsSaving(false)
    }
  }

  function startEditing() {
    setDraftUserName(settings.userName)
    setValidationMessage('')
    setStatusMessage('')
    setIsEditing(true)
  }

  function unlockAccess() {
    if (draftAccessPassword.trim().length === 0) {
      setAccessValidationMessage('Bitte Passwort eingeben.')
      return
    }

    if (!isAllowedAccessPassword(draftAccessPassword)) {
      setAccessValidationMessage('Passwort stimmt nicht.')
      return
    }

    authorizeAccess()
    setDraftAccessPassword('')
    setAccessValidationMessage('')
    setAccessMessage('Cache-Schutz aktiv.')
  }

  function resetAccess() {
    clearAccessAuthorization()
    setDraftAccessPassword('')
    setAccessValidationMessage('')
    setAccessMessage('Cache-Schutz entfernt.')
  }

  function cancelEditing() {
    if (settings.userName.trim().length === 0) return

    setDraftUserName(settings.userName)
    setValidationMessage('')
    setStatusMessage('')
    setIsEditing(false)
  }

  const trimmedUserName = settings.userName.trim()
  const isMissingUserName = trimmedUserName.length === 0
  const showCompactMobileTrigger = !isMissingUserName && !isExpanded

  if (showCompactMobileTrigger) {
    return (
      <>
        <div className="flex justify-end sm:hidden">
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-border-strong bg-surface-muted text-ink app-shadow-action-strong"
            aria-label={`Benutzer ${trimmedUserName} öffnen`}
          >
            <UserBadgeIcon />
          </button>
        </div>

        <Card className="hidden sm:block" variant="compact">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <SectionHeading>Benutzer</SectionHeading>
              <p className="mt-1.5 truncate text-sm font-semibold text-ink sm:mt-2 sm:text-base">
                {trimmedUserName}
              </p>
            </div>
            <ExpandToggle
              isExpanded={isExpanded}
              onToggle={() => setIsExpanded((v) => !v)}
            />
          </div>
        </Card>
      </>
    )
  }

  return (
    <Card variant="compact">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <SectionHeading>Benutzer</SectionHeading>
          <p className="mt-1.5 max-w-[min(58vw,15rem)] truncate text-sm font-semibold text-ink sm:mt-2 sm:max-w-none sm:text-base">
            {isMissingUserName ? 'Noch kein Name gesetzt' : trimmedUserName}
          </p>
        </div>
        <ExpandToggle
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded((v) => !v)}
        />
      </div>

      {isExpanded ? (
        <>
          <div className="mt-3 grid gap-3 md:mt-4 md:grid-cols-2 md:gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Benutzername</label>

              {isEditing ? (
                <div className="space-y-2.5 sm:space-y-3">
                  <FormInput
                    type="text"
                    value={draftUserName}
                    onChange={(event) => {
                      setDraftUserName(event.target.value)
                      setValidationMessage('')
                    }}
                    placeholder="z. B. Vorname Nachname"
                    autoComplete="name"
                    disabled={!isReady || isSaving}
                  />

                  <div className="flex flex-wrap gap-2">
                    <FormButton
                      type="button"
                      onClick={() => void saveUserName()}
                      disabled={!isReady || isSaving}
                    >
                      {isSaving ? 'Speichert ...' : 'Speichern'}
                    </FormButton>

                    {!isMissingUserName ? (
                      <FormButton
                        type="button"
                        onClick={cancelEditing}
                        disabled={isSaving}
                        variant="secondary"
                      >
                        Abbrechen
                      </FormButton>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
                  <ReadonlyField className="flex-1">{trimmedUserName}</ReadonlyField>
                  <FormButton type="button" onClick={startEditing}>
                    Bearbeiten
                  </FormButton>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Passwort</label>

              {isAccessApproved ? (
                <div className="space-y-2.5 sm:space-y-3">
                  <ReadonlyField>Cache-Schutz aktiv</ReadonlyField>
                  <FormButton type="button" onClick={resetAccess} variant="secondary">
                    Zurücksetzen
                  </FormButton>
                </div>
              ) : (
                <div className="space-y-2.5 sm:space-y-3">
                  <FormInput
                    type="password"
                    value={draftAccessPassword}
                    onChange={(event) => {
                      setDraftAccessPassword(event.target.value)
                      setAccessValidationMessage('')
                      setAccessMessage('')
                    }}
                    placeholder="Passwort eingeben"
                    autoComplete="off"
                  />
                  <FormButton type="button" onClick={unlockAccess}>
                    Freigeben
                  </FormButton>
                  <InlineAlert variant="info">
                    Ohne Passwort wird der Cache nach {ACCESS_SESSION_DURATION_MINUTES} Minuten gelöscht.
                  </InlineAlert>
                </div>
              )}
            </div>
          </div>

          {validationMessage ? <InlineAlert variant="error">{validationMessage}</InlineAlert> : null}
          {statusMessage ? <InlineAlert variant="success">{statusMessage}</InlineAlert> : null}
          {accessValidationMessage ? <InlineAlert variant="error">{accessValidationMessage}</InlineAlert> : null}
          {accessMessage ? <InlineAlert variant="success">{accessMessage}</InlineAlert> : null}
          {isMissingUserName ? (
            <InlineAlert variant="warning">
              Für saubere Exportdateien den Benutzernamen einmal setzen.
            </InlineAlert>
          ) : null}
        </>
      ) : null}
    </Card>
  )
}
