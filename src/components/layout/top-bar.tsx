'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Start' },
  { href: '/work', label: 'Arbeit' },
  { href: '/sessions', label: 'Weidegänge' },
  { href: '/enclosures', label: 'Pferche' },
  { href: '/herds', label: 'Herde' },
  { href: '/export', label: 'Export & Import' },
  { href: '/settings', label: 'Einstellungen' },
]

export function TopBar() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-30 border-b border-[#061a14] bg-[linear-gradient(180deg,#123a2d,#0c281f)] text-white shadow-[0_16px_38px_rgba(8,23,17,0.38)]">
      <div className="mx-auto flex min-h-18 max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="shrink-0">
          <p className="text-lg font-semibold tracking-[-0.02em] text-white">Hiaterbua 1.0</p>
          <p className="text-xs uppercase tracking-[0.16em] text-[#dce9e1]">
            Offlinefähige Felddokumentation
          </p>
        </div>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => {
            const active = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                  active
                    ? 'border-white bg-[#2f6b4d] !text-white shadow-[0_12px_28px_rgba(9,28,20,0.28)]'
                    : 'border-[#0a2018] bg-[#fffdf8] !text-[#111111] shadow-[0_8px_18px_rgba(9,28,20,0.16)] hover:bg-[#f7f4eb]',
                ].join(' ')}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
