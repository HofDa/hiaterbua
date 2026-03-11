'use client'

import { useState, type ReactNode } from 'react'

type DesktopMapPanelProps = {
  title: string
  summary?: string
  defaultCollapsed?: boolean
  children: ReactNode
}

export function DesktopMapPanel({
  title,
  summary,
  defaultCollapsed = false,
  children,
}: DesktopMapPanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  return (
    <section className="hidden rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)] lg:block">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-neutral-950">{title}</h2>
          {summary ? (
            <p className="mt-1 text-sm text-neutral-700">{summary}</p>
          ) : null}
        </div>

        <button
          type="button"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Panel öffnen' : 'Panel schließen'}
          onClick={() => setCollapsed((current) => !current)}
          className="shrink-0 rounded-full border border-[#ccb98a] bg-[#fffdf6] px-3 py-2 text-xs font-semibold text-neutral-950 shadow-sm"
        >
          {collapsed ? '+' : '-'}
        </button>
      </div>

      {!collapsed ? <div className="mt-4">{children}</div> : null}
    </section>
  )
}
