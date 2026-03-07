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
    <nav className="sticky bottom-0 z-30 border-t border-[rgba(22,61,47,0.38)] bg-[linear-gradient(180deg,rgba(24,58,45,0.94),rgba(18,45,35,0.98))] shadow-[0_-14px_34px_rgba(14,28,22,0.22)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-2 px-3 py-3">
        {items.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'rounded-2xl border px-3 py-3 text-center text-sm font-semibold shadow-sm transition-colors',
                active
                  ? 'border-[#173b2e] bg-[linear-gradient(180deg,#224f3d,#123126)] text-[#fff8e7] shadow-[0_12px_28px_rgba(7,16,12,0.34)] ring-2 ring-[#d9ecd7]'
                  : 'border-[#d8cfba] bg-[linear-gradient(180deg,#f8f2e7,#e8dcc8)] text-[#16241d] shadow-[0_8px_18px_rgba(9,18,14,0.18)]',
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
