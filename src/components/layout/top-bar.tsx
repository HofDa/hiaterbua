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
    <header className="sticky top-0 z-30 border-b border-white/50 bg-[rgba(255,252,246,0.72)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-18 max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="shrink-0">
          <p className="text-lg font-semibold tracking-[-0.02em] text-neutral-950">Hiaterbua 1.0</p>
          <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
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
                    ? 'border-[rgba(31,106,73,0.25)] bg-[linear-gradient(135deg,#1f6a49,#164c35)] text-white shadow-[0_10px_24px_rgba(31,106,73,0.25)]'
                    : 'border-white/60 bg-white/55 text-neutral-700 hover:bg-white/85',
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
