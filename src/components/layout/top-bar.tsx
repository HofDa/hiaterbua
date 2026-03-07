'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Start' },
  { href: '/herds', label: 'Herden' },
  { href: '/enclosures', label: 'Pferche' },
  { href: '/sessions', label: 'Weidegänge' },
  { href: '/work', label: 'Arbeit' },
  { href: '/export', label: 'Export & Import' },
  { href: '/settings', label: 'Einstellungen' },
]

export function TopBar() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(22,61,47,0.38)] bg-[linear-gradient(180deg,rgba(28,68,53,0.96),rgba(19,49,38,0.9))] text-white shadow-[0_14px_34px_rgba(14,28,22,0.22)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-18 max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="shrink-0">
          <p className="text-lg font-semibold tracking-[-0.02em] text-white">Hiaterbua 1.0</p>
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-50/72">
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
                  'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'border-emerald-200/30 bg-[linear-gradient(135deg,#f4efe5,#ddd2bf)] text-neutral-950 shadow-[0_10px_24px_rgba(9,18,14,0.22)]'
                    : 'border-white/10 bg-white/8 text-emerald-50/88 hover:bg-white/14',
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
