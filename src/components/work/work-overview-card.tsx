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
    segmentColor: '#b7653e',
    swatchClass: 'bg-[#b7653e]',
    badgeClass: 'bg-[#efd0bf]',
  },
  guided_infrastructure: {
    segmentColor: '#7d6a49',
    swatchClass: 'bg-[#7d6a49]',
    badgeClass: 'bg-[#e4dbc8]',
  },
  guided_animal_care: {
    segmentColor: '#4c7a63',
    swatchClass: 'bg-[#4c7a63]',
    badgeClass: 'bg-[#d1e2d8]',
  },
  guided_pasture_care: {
    segmentColor: '#8a7f34',
    swatchClass: 'bg-[#8a7f34]',
    badgeClass: 'bg-[#ebe4bd]',
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
    <div className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
      <h2 className="text-lg font-semibold tracking-[-0.02em]">Übersicht</h2>
      <div className="mt-4 grid gap-3 text-sm">
        <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
          <div className="text-neutral-700">Laufender Einsatz</div>
          <div className="mt-1 font-medium text-neutral-900">
            {activeSession ? getWorkLabel(activeSession) : 'Keiner'}
          </div>
        </div>
        <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
          <div className="text-neutral-700">Letzter Status</div>
          <div className="mt-1 font-medium text-neutral-900">
            {getWorkStatusLabel(activeSession?.status)}
          </div>
        </div>
        <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
          <div className="text-neutral-700">Erfasste Einsätze</div>
          <div className="mt-1 font-medium text-neutral-900">{sessions.length}</div>
        </div>
      </div>

      <div className="mt-4 rounded-[1.3rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-neutral-900">Grafische Auswertung</div>
            <div className="mt-1 text-xs font-medium text-neutral-700">
              Kreisdiagramm der Arbeitszeit nach Bereich
            </div>
          </div>
          <div className="rounded-full border border-[#d2cbc0] bg-[#f8f1e2] px-3 py-1 text-xs font-semibold text-[#17130f]">
            Gesamt {formatDuration(sectionStats.totalDurationS)}
          </div>
        </div>

        {hasChartData ? (
          <>
            <div className="mt-4">
              <div className="mx-auto w-fit">
                <div
                  className="relative h-40 w-40 rounded-full border border-[#d8ccb0] shadow-sm sm:h-44 sm:w-44"
                  style={{ backgroundImage: pieGradient }}
                  aria-hidden="true"
                >
                  <div className="absolute inset-[22%] flex items-center justify-center rounded-full border border-[#e1d5ba] bg-[#fffdf6] text-center shadow-sm">
                    <div className="px-2">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-600">
                        Gesamt
                      </div>
                      <div className="mt-1 text-sm font-semibold text-[#17130f]">
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
                      className="rounded-[1rem] border border-[#e3d8bc] bg-[#fcf8ef] px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${colors.swatchClass}`}
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-neutral-900">
                              {item.label}
                            </div>
                            <div className="text-xs text-neutral-600">{item.count} Einsätze</div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <div className="rounded-full border border-[#d7ccb3] bg-[#fffdf6] px-2.5 py-1 text-xs font-semibold text-[#17130f]">
                            {sharePercent}%
                          </div>
                          <div
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold text-[#17130f] ${colors.badgeClass}`}
                          >
                            {formatDuration(item.durationS)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#ece7dc]">
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
          <div className="mt-4 rounded-[1rem] border border-[#d2cbc0] bg-[#f8f1e2] px-4 py-3 text-sm text-[#17130f]">
            Noch keine Dauerwerte für eine Auswertung vorhanden.
          </div>
        )}
      </div>
    </div>
  )
}
