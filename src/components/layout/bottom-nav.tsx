'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/', label: 'Start' },
  { href: '/herds', label: 'Herden' },
  { href: '/enclosures', label: 'Pferche' },
  { href: '/sessions', label: 'Weidegänge' },
  { href: '/work', label: 'Arbeit' },
  { href: '/export', label: 'Import' },
  { href: '/settings', label: 'Einstellungen' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="sticky bottom-0 z-30 border-t border-white/50 bg-[rgba(255,252,246,0.82)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-2 px-3 py-3">
        {items.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'rounded-2xl border px-3 py-3 text-center text-sm font-medium shadow-sm transition-colors',
                active
                  ? 'border-[rgba(31,106,73,0.25)] bg-[linear-gradient(135deg,#1f6a49,#164c35)] text-white'
                  : 'border-white/60 bg-white/75 text-neutral-800',
              ].join(' ')}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
