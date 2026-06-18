'use client'

import { useMemo } from 'react'
import {
  formatDuration,
  getLiveDurationS,
  getWorkLabel,
  getWorkPickerSectionId,
  getWorkStatusLabel,
  workPickerSections,
} from '@/lib/work/work-session-helpers'
import type { WorkSession } from '@/types/domain'

type WorkOverviewCardProps = {
  activeSession: WorkSession | null
  sessions: WorkSession[]
  nowMs: number
}

const overviewColors = {
  guided_herd_management: {
    segmentColor: 'var(--work-management)',
    swatchClass: 'bg-work-management',
    badgeClass: 'bg-work-management-soft',
  },
  guided_infrastructure: {
    segmentColor: 'var(--work-infrastructure)',
    swatchClass: 'bg-work-infrastructure',
    badgeClass: 'bg-work-infrastructure-soft',
  },
  guided_animal_care: {
    segmentColor: 'var(--work-animal-care)',
    swatchClass: 'bg-work-animal-care',
    badgeClass: 'bg-work-animal-care-soft',
  },
  guided_pasture_care: {
    segmentColor: 'var(--work-pasture-care)',
    swatchClass: 'bg-work-pasture-care',
    badgeClass: 'bg-work-pasture-care-soft',
  },
} as const

export function WorkOverviewCard({ activeSession, sessions, nowMs }: WorkOverviewCardProps) {
  const sectionStats = useMemo(() => {
    const totals = new Map(
      workPickerSections.map((section) => [
        section.id,
        {
          id: section.id,
          label: section.label,
          durationS: 0,
          count: 0,
        },
      ])
    )

    for (const session of sessions) {
      const sectionId = getWorkPickerSectionId(session)
      const existingEntry = totals.get(sectionId)

      if (!existingEntry) continue

      existingEntry.count += 1
      existingEntry.durationS +=
        session.status === 'active' ? getLiveDurationS(session, nowMs) : session.durationS
    }

    const values = workPickerSections
      .map((section) => totals.get(section.id)!)
      .sort((left, right) => right.durationS - left.durationS)
    const totalDurationS = values.reduce((sum, item) => sum + item.durationS, 0)
    const chartItems = values.filter((item) => item.durationS > 0)

    return {
      totalDurationS,
      chartItems: chartItems.map((item) => ({
        ...item,
        share: totalDurationS > 0 ? item.durationS / totalDurationS : 0,
      })),
    }
  }, [sessions, nowMs])

  const hasChartData = sectionStats.chartItems.length > 0
  const pieGradient = useMemo(() => {
    if (!hasChartData) return 'none'

    let currentShare = 0

    return `conic-gradient(${sectionStats.chartItems
      .map((item) => {
        const start = currentShare * 100
        currentShare += item.share
        const end = currentShare * 100
        return `${overviewColors[item.id].segmentColor} ${start}% ${end}%`
      })
      .join(', ')})`
  }, [hasChartData, sectionStats.chartItems])

  return (
    <div className="app-panel p-5">
      <h2 className="text-lg font-semibold tracking-[-0.02em]">Übersicht</h2>
      <div className="mt-4 grid gap-3 text-sm">
        <div className="app-surface-row px-4 py-3">
          <div className="text-ink-muted">Laufender Einsatz</div>
          <div className="mt-1 font-medium text-ink">
            {activeSession ? getWorkLabel(activeSession) : 'Keiner'}
          </div>
        </div>
        <div className="app-surface-row px-4 py-3">
          <div className="text-ink-muted">Letzter Status</div>
          <div className="mt-1 font-medium text-ink">
            {getWorkStatusLabel(activeSession?.status)}
          </div>
        </div>
        <div className="app-surface-row px-4 py-3">
          <div className="text-ink-muted">Erfasste Einsätze</div>
          <div className="mt-1 font-medium text-ink">{sessions.length}</div>
        </div>
      </div>

      <div className="mt-4 rounded-[1.3rem] border border-border bg-surface-raised px-4 py-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-ink">Grafische Auswertung</div>
            <div className="mt-1 text-xs font-medium text-ink-muted">
              Kreisdiagramm der Arbeitszeit nach Bereich
            </div>
          </div>
          <div className="rounded-full border border-border-soft bg-surface-warm px-3 py-1 text-xs font-semibold text-ink">
            Gesamt {formatDuration(sectionStats.totalDurationS)}
          </div>
        </div>

        {hasChartData ? (
          <>
            <div className="mt-4">
              <div className="mx-auto w-fit">
                <div
                  className="relative h-40 w-40 rounded-full border border-chart-border shadow-sm sm:h-44 sm:w-44"
                  style={{ backgroundImage: pieGradient }}
                  aria-hidden="true"
                >
                  <div className="absolute inset-[22%] flex items-center justify-center rounded-full border border-chart-border-inner bg-surface-raised text-center shadow-sm">
                    <div className="px-2">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                        Gesamt
                      </div>
                      <div className="mt-1 text-sm font-semibold text-ink">
                        {formatDuration(sectionStats.totalDurationS)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                {sectionStats.chartItems.map((item) => {
                  const colors = overviewColors[item.id]
                  const sharePercent = Math.round(item.share * 100)

                  return (
                    <div
                      key={item.id}
                      className="rounded-[1rem] border border-chart-card-border bg-chart-card-surface px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${colors.swatchClass}`}
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-ink">
                              {item.label}
                            </div>
                            <div className="text-xs text-ink-muted">{item.count} Einsätze</div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <div className="rounded-full border border-chart-badge-border bg-surface-raised px-2.5 py-1 text-xs font-semibold text-ink">
                            {sharePercent}%
                          </div>
                          <div
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold text-ink ${colors.badgeClass}`}
                          >
                            {formatDuration(item.durationS)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-chart-track">
                        <div
                          className={`h-full rounded-full ${colors.swatchClass}`}
                          style={{ width: `${Math.max(sharePercent, 6)}%` }}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-[1rem] border border-border-soft bg-surface-warm px-4 py-3 text-sm text-ink">
            Noch keine Dauerwerte für eine Auswertung vorhanden.
          </div>
        )}
      </div>
    </div>
  )
}
