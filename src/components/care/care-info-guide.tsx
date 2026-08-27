'use client'

import { ExternalLink, Footprints, Leaf, Sprout } from 'lucide-react'
import type { ReactNode } from 'react'
import { simpleTerms } from '@/lib/care/care-guide'

function InfoDetails({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <details className="group rounded-[1.1rem] border border-border bg-surface-raised px-4 py-3">
      <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink-strong [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span aria-hidden="true" className="text-ink-muted transition-transform group-open:rotate-180">
          ⌄
        </span>
      </summary>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink-muted">{children}</div>
    </details>
  )
}

export function CareInfoGuide() {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Leaf aria-hidden="true" className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-ink-strong">Kurz erklärt</h2>
      </div>

      <InfoDetails title="Wie sieht zu viel Tritt aus?">
        <div className="flex items-start gap-2">
          <Footprints aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" />
          <div>
            <p>
              <strong className="text-ink-strong">Einzelne Hufspuren:</strong> meist normal. Kleine offene
              Stellen können sogar erwünscht sein.
            </p>
            <p className="mt-1.5">
              <strong className="text-ink-strong">Zu stark:</strong> größere kahle Stellen, tiefe Löcher,
              Schlamm oder Boden, der sichtbar abrutscht bzw. abgeschwemmt wird.
            </p>
          </div>
        </div>
      </InfoDetails>

      <InfoDetails title="Was bedeutet Nährstoffansammlung?">
        <div className="flex items-start gap-2">
          <Sprout aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" />
          <div>
            <p>
              Wo Tiere immer wieder lange stehen oder liegen, sammeln sich <strong className="text-ink-strong">Kot und Urin</strong>.
              Das bringt viele Nährstoffe auf eine kleine Stelle.
            </p>
            <p className="mt-1.5">
              Auf mageren, artenreichen Flächen kann das unerwünscht sein: wenige stark wachsende Pflanzen
              können andere Arten verdrängen.
            </p>
            <p className="mt-1.5">
              <strong className="text-ink-strong">Abschwächen:</strong> Tränke, Salzstelle und Ruheplatz
              wechseln, Tiere früher umtreiben oder sensible Stellen ausgrenzen.
            </p>
            <p className="mt-1.5">
              <strong className="text-ink-strong">Gezielt lenken/fördern:</strong> Nur wenn der Pflegeplan es ausdrücklich vorsieht,
              können Tränke, Salz oder längere Ruhezeiten auf robuste, nährstoffreichere Teilflächen gelegt werden. Auf mageren
              Zielbiotopen ist zusätzliche Nährstoffkonzentration meist gerade nicht erwünscht.
            </p>
          </div>
        </div>
      </InfoDetails>

      <InfoDetails title="Was heißt Gräser und Kräuter?">
        <p>
          Gemeint ist die niedrige, weiche Vegetation: Gräser, Kräuter und andere nicht verholzte Pflanzen.
          In Fachtexten steht dafür oft <strong className="text-ink-strong">Krautschicht</strong>.
        </p>
      </InfoDetails>

      <InfoDetails title="Fachwörter nachschlagen">
        <div className="space-y-2">
          {simpleTerms.map((term) => (
            <div key={term.technical} className="rounded-lg bg-surface-muted px-3 py-2.5">
              <div className="font-semibold text-ink-strong">{term.title}</div>
              <div className="text-xs font-medium text-ink-muted">Fachwort: {term.technical}</div>
              <p className="mt-1">{term.body}</p>
            </div>
          ))}
        </div>
      </InfoDetails>

      <p className="flex items-center gap-1.5 px-1 text-xs leading-relaxed text-ink-muted">
        <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        Pflanzenlinks im Pflegecheck öffnen eine externe Bild-/Arthilfe und brauchen Netz.
      </p>
    </section>
  )
}
