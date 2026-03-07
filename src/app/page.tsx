'use client'

import Link from 'next/link'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '@/lib/db/dexie'

const quickLinks = [
  {
    href: '/enclosures',
    title: 'Pferche',
    description: 'Zeichnen, ablaufen und bestehende Flächen bearbeiten.',
    cardClass:
      'border-emerald-950/20 bg-[linear-gradient(135deg,#1f6a49,#164c35)] text-white',
    chipClass: 'border-white/20 bg-white/10 text-white',
    textClass: 'text-white',
    descriptionClass: 'text-white/90',
  },
  {
    href: '/herds',
    title: 'Herden',
    description: 'Herden verwalten, Tiere erfassen und Belegungen steuern.',
    cardClass:
      'border-neutral-950/30 bg-[linear-gradient(135deg,#171412,#2a241f)] text-white',
    chipClass: 'border-white/20 bg-white/10 text-white',
    textClass: 'text-white',
    descriptionClass: 'text-white/90',
  },
  {
    href: '/sessions',
    title: 'Weidegänge',
    description: 'Geführte Weidegänge starten und GPS-Spuren speichern.',
    cardClass:
      'border-amber-300 bg-[linear-gradient(135deg,#fbbf24,#f59e0b)] text-neutral-950',
    chipClass: 'border-amber-800/20 bg-white/55 text-neutral-950',
    textClass: 'text-neutral-950',
    descriptionClass: 'text-neutral-900',
  },
  {
    href: '/work',
    title: 'Arbeit',
    description: 'Allgemeine Arbeitszeit und Tätigkeiten erfassen.',
    cardClass:
      'border-stone-950/20 bg-[linear-gradient(135deg,#3f372f,#241f1a)] text-white',
    chipClass: 'border-white/20 bg-white/10 text-white',
    textClass: 'text-white',
    descriptionClass: 'text-white/90',
  },
  {
    href: '/export',
    title: 'Export & Import',
    description: 'GeoJSON, GPX und App-Daten ausgeben oder wieder einlesen.',
    cardClass:
      'border-neutral-300 bg-[linear-gradient(135deg,#fffdf8,#efe7d8)] text-neutral-950',
    chipClass: 'border-neutral-300 bg-white text-neutral-800',
    textClass: 'text-neutral-950',
    descriptionClass: 'text-neutral-800',
  },
]

export default function HomePage() {
  const [showFieldReadyCard, setShowFieldReadyCard] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.localStorage.getItem('hiaterbua-field-ready-dismissed') !== '1'
  )

  const dashboardData = useLiveQuery(async () => {
    const [herds, enclosures, sessions, assignments, workSessions] = await Promise.all([
      db.herds.toArray(),
      db.enclosures.toArray(),
      db.sessions.toArray(),
      db.enclosureAssignments.toArray(),
      db.workSessions.toArray(),
    ])

    return {
      herdsCount: herds.filter((herd) => !herd.isArchived).length,
      enclosuresCount: enclosures.length,
      activeSessionsCount: sessions.filter(
        (session) => session.status === 'active' || session.status === 'paused'
      ).length,
      activeAssignmentsCount: assignments.filter((assignment) => !assignment.endTime).length,
      activeWorkSessionsCount: workSessions.filter(
        (session) => session.status === 'active' || session.status === 'paused'
      ).length,
    }
  }, [])

  function dismissFieldReadyCard() {
    window.localStorage.setItem('hiaterbua-field-ready-dismissed', '1')
    setShowFieldReadyCard(false)
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] border border-white/20 bg-[linear-gradient(135deg,#163d2f,#101513)] p-6 text-white shadow-[0_24px_60px_rgba(23,20,18,0.22)]">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
            Einstieg
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Hiaterbua 1.0
          </h1>
          <p className="mt-3 max-w-xl text-sm text-white/90 sm:text-base">
            Herden, Pferche, Untersuchungsflächen und Weidegänge direkt vor Ort erfassen und offline weiterführen.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/enclosures"
              className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.28)]"
            >
              Zur Karte
            </Link>
            <Link
              href="/herds"
              className="rounded-full border border-amber-400 bg-amber-300 px-5 py-3 text-sm font-semibold !text-neutral-950 shadow-[0_10px_24px_rgba(180,83,9,0.22)]"
            >
              Herden öffnen
            </Link>
          </div>
        </div>
      </section>

      {showFieldReadyCard ? (
        <section className="rounded-[1.9rem] border border-emerald-950/10 bg-[linear-gradient(135deg,#fffdf7,#efe6d6)] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600">
                Außeneinsatz
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-neutral-950">
                Vor dem Einsatz kurz prüfen
              </h2>
            </div>
            <button
              type="button"
              onClick={dismissFieldReadyCard}
              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-900 shadow-sm"
            >
              Schließen
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.25rem] border border-white/70 bg-white/90 px-4 py-4 shadow-sm">
              <div className="text-sm font-semibold text-neutral-950">1. App installieren</div>
              <p className="mt-2 text-sm text-neutral-700">
                Nutze den Install-Button oben, damit Hiaterbua 1.0 wie eine echte Android-App startet.
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-white/70 bg-white/90 px-4 py-4 shadow-sm">
              <div className="text-sm font-semibold text-neutral-950">2. Karten sichern</div>
              <p className="mt-2 text-sm text-neutral-700">
                Den benötigten Kartenausschnitt oder das Detailgebiet vorher offline in den Tile-Cache laden.
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-white/70 bg-white/90 px-4 py-4 shadow-sm">
              <div className="text-sm font-semibold text-neutral-950">3. GPS testen</div>
              <p className="mt-2 text-sm text-neutral-700">
                Vor Ort kurz Kartenansicht öffnen und prüfen, ob Position und Genauigkeit sauber ankommen.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,252,246,0.82)] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)] backdrop-blur">
          <div className="text-sm font-medium text-neutral-500">Aktive Herden</div>
          <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-neutral-950">
            {dashboardData?.herdsCount ?? '...'}
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,252,246,0.82)] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)] backdrop-blur">
          <div className="text-sm font-medium text-neutral-500">Pferche</div>
          <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-neutral-950">
            {dashboardData?.enclosuresCount ?? '...'}
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,252,246,0.82)] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)] backdrop-blur">
          <div className="text-sm font-medium text-neutral-500">Laufende Weidegänge</div>
          <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-neutral-950">
            {dashboardData?.activeSessionsCount ?? '...'}
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,252,246,0.82)] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)] backdrop-blur">
          <div className="text-sm font-medium text-neutral-500">Aktive Pferch-Belegungen</div>
          <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-neutral-950">
            {dashboardData?.activeAssignmentsCount ?? '...'}
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,252,246,0.82)] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)] backdrop-blur">
          <div className="text-sm font-medium text-neutral-500">Arbeit läuft</div>
          <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-neutral-950">
            {dashboardData?.activeWorkSessionsCount ?? '...'}
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`group rounded-[1.75rem] border p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)] transition-transform hover:-translate-y-0.5 ${link.cardClass}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className={`text-xl font-semibold tracking-[-0.02em] ${link.textClass}`}>{link.title}</div>
              <div className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${link.chipClass}`}>
                Modul
              </div>
            </div>
            <p className={`mt-3 max-w-sm text-sm ${link.descriptionClass}`}>{link.description}</p>
            <div className={`mt-6 text-sm font-semibold transition-transform group-hover:translate-x-1 ${link.textClass}`}>
              Öffnen →
            </div>
          </Link>
        ))}
      </section>

      <section className="rounded-[1.9rem] border border-white/70 bg-[rgba(255,252,246,0.82)] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)] backdrop-blur">
        <h2 className="text-lg font-semibold tracking-[-0.02em]">Schnellzugriff</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Link href="/enclosures" className="rounded-[1.25rem] border border-white/60 bg-white/80 px-4 py-4 text-sm font-medium text-neutral-900 shadow-sm">
            Pferch zeichnen oder ablaufen
          </Link>
          <Link href="/herds" className="rounded-[1.25rem] border border-white/60 bg-white/80 px-4 py-4 text-sm font-medium text-neutral-900 shadow-sm">
            Herde anlegen und Tiere pflegen
          </Link>
          <Link href="/sessions" className="rounded-[1.25rem] border border-white/60 bg-white/80 px-4 py-4 text-sm font-medium text-neutral-900 shadow-sm">
            Geführten Weidegang starten
          </Link>
          <Link href="/work" className="rounded-[1.25rem] border border-white/60 bg-white/80 px-4 py-4 text-sm font-medium text-neutral-900 shadow-sm">
            Arbeitszeit und Tätigkeit starten
          </Link>
          <Link href="/export" className="rounded-[1.25rem] border border-white/60 bg-white/80 px-4 py-4 text-sm font-medium text-neutral-900 shadow-sm">
            Exportieren oder Daten importieren
          </Link>
        </div>
      </section>
    </div>
  )
}
