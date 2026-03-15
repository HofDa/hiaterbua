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

function UserBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current">
      <circle cx="12" cy="8" r="3.25" strokeWidth="1.8" />
      <path d="M5.5 18.25c1.1-3 3.57-4.5 6.5-4.5s5.4 1.5 6.5 4.5" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
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

  useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      const fallbackSettings = readFallbackSettings()

      if (fallbackSettings && !cancelled) {
        setSettings(fallbackSettings)
        setDraftUserName(fallbackSettings.userName)
        setIsEditing(fallbackSettings.userName.trim().length === 0)
        setIsExpanded(fallbackSettings.userName.trim().length === 0)
      }

      try {
        const storedSettings = await withTimeout(db.settings.get('app'))

        if (cancelled) {
          return
        }

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

        setSettings(nextSettings)
        setDraftUserName(nextSettings.userName)
        setIsEditing(nextSettings.userName.trim().length === 0)
        setIsExpanded(nextSettings.userName.trim().length === 0)
        writeFallbackSettings(nextSettings)
      } catch {
        if (cancelled) {
          return
        }

        const nextSettings = normalizeSettingsValue(fallbackSettings ?? defaultAppSettings)
        setSettings(nextSettings)
        setDraftUserName(nextSettings.userName)
        setIsEditing(nextSettings.userName.trim().length === 0)
        setIsExpanded(nextSettings.userName.trim().length === 0)
        writeFallbackSettings(nextSettings)
      } finally {
        if (!cancelled) {
          setIsReady(true)
        }
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
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#5a5347] bg-[#f1efeb] text-[#17130f] shadow-[0_12px_24px_rgba(40,34,26,0.14)]"
            aria-label={`Benutzer ${trimmedUserName} öffnen`}
          >
            <UserBadgeIcon />
          </button>
        </div>

        <section className="hidden rounded-[1.55rem] border-2 border-[#3a342a] bg-[#fff8ea] p-4 shadow-[0_18px_40px_rgba(40,34,26,0.08)] sm:block sm:rounded-[1.9rem] sm:p-5">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e5549]">
                Benutzer
              </div>
              <p className="mt-1.5 max-w-[min(58vw,15rem)] truncate text-sm font-semibold text-[#17130f] sm:mt-2 sm:max-w-none sm:text-base">
                {trimmedUserName}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setIsExpanded((currentValue) => !currentValue)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#5a5347] bg-[#f1efeb] text-base font-semibold text-[#17130f] sm:h-10 sm:w-10 sm:text-lg"
                aria-expanded={isExpanded}
                aria-label={isExpanded ? 'Benutzerkarte einklappen' : 'Benutzerkarte aufklappen'}
              >
                {isExpanded ? '-' : '+'}
              </button>
            </div>
          </div>
        </section>
      </>
    )
  }

  return (
    <section className="rounded-[1.55rem] border-2 border-[#3a342a] bg-[#fff8ea] p-4 shadow-[0_18px_40px_rgba(40,34,26,0.08)] sm:rounded-[1.9rem] sm:p-5">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e5549]">
            Benutzer
          </div>
          <p
            className="mt-1.5 max-w-[min(58vw,15rem)] truncate text-sm font-semibold text-[#17130f] sm:mt-2 sm:max-w-none sm:text-base"
          >
            {isMissingUserName ? 'Noch kein Name gesetzt' : trimmedUserName}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded((currentValue) => !currentValue)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#5a5347] bg-[#f1efeb] text-base font-semibold text-[#17130f] sm:h-10 sm:w-10 sm:text-lg"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Benutzerkarte einklappen' : 'Benutzerkarte aufklappen'}
          >
            {isExpanded ? '-' : '+'}
          </button>
        </div>
      </div>

      {isExpanded ? (
        <>
          <div className="mt-3 grid gap-3 md:mt-4 md:grid-cols-2 md:gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Benutzername</label>

              {isEditing ? (
                <div className="space-y-2.5 sm:space-y-3">
                  <input
                    type="text"
                    value={draftUserName}
                    onChange={(event) => {
                      setDraftUserName(event.target.value)
                      setValidationMessage('')
                    }}
                    placeholder="z. B. Vorname Nachname"
                    className="w-full rounded-[1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-3.5 py-2.5 text-sm shadow-sm sm:rounded-[1.1rem] sm:px-4 sm:py-3 sm:text-base"
                    autoComplete="name"
                    disabled={!isReady || isSaving}
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void saveUserName()}
                      disabled={!isReady || isSaving}
                      className="rounded-[1rem] border border-[#5a5347] bg-[#f1efeb] px-3.5 py-2.5 text-sm font-semibold text-[#17130f] disabled:opacity-50 sm:rounded-[1.1rem] sm:px-4 sm:py-3"
                    >
                      {isSaving ? 'Speichert ...' : 'Speichern'}
                    </button>

                    {!isMissingUserName ? (
                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={isSaving}
                        className="rounded-[1rem] border border-[#ccb98a] bg-[#fffdf6] px-3.5 py-2.5 text-sm font-semibold text-neutral-950 disabled:opacity-50 sm:rounded-[1.1rem] sm:px-4 sm:py-3"
                      >
                        Abbrechen
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
                  <div className="min-h-[3rem] flex-1 rounded-[1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-3.5 py-2.5 text-sm font-medium text-[#17130f] shadow-sm sm:min-h-[3.5rem] sm:rounded-[1.1rem] sm:px-4 sm:py-3 sm:text-base">
                    {trimmedUserName}
                  </div>
                  <button
                    type="button"
                    onClick={startEditing}
                    className="rounded-[1rem] border border-[#5a5347] bg-[#f1efeb] px-3.5 py-2.5 text-sm font-semibold text-[#17130f] sm:rounded-[1.1rem] sm:px-4 sm:py-3"
                  >
                    Bearbeiten
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Passwort</label>

              {isAccessApproved ? (
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="min-h-[3rem] rounded-[1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-3.5 py-2.5 text-sm font-medium text-[#17130f] shadow-sm sm:min-h-[3.5rem] sm:rounded-[1.1rem] sm:px-4 sm:py-3 sm:text-base">
                    Cache-Schutz aktiv
                  </div>

                  <button
                    type="button"
                    onClick={resetAccess}
                    className="rounded-[1rem] border border-[#ccb98a] bg-[#fffdf6] px-3.5 py-2.5 text-sm font-semibold text-neutral-950 sm:rounded-[1.1rem] sm:px-4 sm:py-3"
                  >
                    Zurücksetzen
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 sm:space-y-3">
                  <input
                    type="password"
                    value={draftAccessPassword}
                    onChange={(event) => {
                      setDraftAccessPassword(event.target.value)
                      setAccessValidationMessage('')
                      setAccessMessage('')
                    }}
                    placeholder="Passwort eingeben"
                    className="w-full rounded-[1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-3.5 py-2.5 text-sm shadow-sm sm:rounded-[1.1rem] sm:px-4 sm:py-3 sm:text-base"
                    autoComplete="off"
                  />

                  <button
                    type="button"
                    onClick={unlockAccess}
                    className="rounded-[1rem] border border-[#5a5347] bg-[#f1efeb] px-3.5 py-2.5 text-sm font-semibold text-[#17130f] sm:rounded-[1.1rem] sm:px-4 sm:py-3"
                  >
                    Freigeben
                  </button>

                  <div className="rounded-[1rem] border border-[#d2cbc0] bg-[#f8f1e2] px-3.5 py-2.5 text-sm text-[#17130f] shadow-sm sm:rounded-[1.1rem] sm:px-4 sm:py-3">
                    Ohne Passwort wird der Cache nach {ACCESS_SESSION_DURATION_MINUTES} Minuten geloescht.
                  </div>
                </div>
              )}
            </div>
          </div>

          {validationMessage ? (
            <div className="mt-3 rounded-[1rem] border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-800 sm:mt-4 sm:px-4 sm:py-3">
              {validationMessage}
            </div>
          ) : null}

          {statusMessage ? (
            <div className="mt-3 rounded-[1rem] border border-[#c5d3c8] bg-[#edf1ec] px-3.5 py-2.5 text-sm font-semibold text-[#243228] sm:mt-4 sm:px-4 sm:py-3">
              {statusMessage}
            </div>
          ) : null}

          {accessValidationMessage ? (
            <div className="mt-3 rounded-[1rem] border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-800 sm:mt-4 sm:px-4 sm:py-3">
              {accessValidationMessage}
            </div>
          ) : null}

          {accessMessage ? (
            <div className="mt-3 rounded-[1rem] border border-[#c5d3c8] bg-[#edf1ec] px-3.5 py-2.5 text-sm font-semibold text-[#243228] sm:mt-4 sm:px-4 sm:py-3">
              {accessMessage}
            </div>
          ) : null}

          {isMissingUserName ? (
            <div className="mt-3 rounded-[1rem] border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-900 sm:mt-4 sm:px-4 sm:py-3">
              Für saubere Exportdateien den Benutzernamen einmal setzen.
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
