'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { useHapticFeedback } from '@/hooks/use-haptic-feedback'
import { navItems } from './nav-items'

export function BottomNav() {
  const pathname = usePathname()
  const triggerHaptic = useHapticFeedback()

  return (
    <nav className="sticky bottom-0 z-30 border-t border-chrome-border bg-chrome-shell app-chrome-bottom md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-2 px-3 py-3">
        {navItems.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => triggerHaptic('light')}
              className={cn(
                'rounded-2xl border px-3 py-3 text-center text-sm font-semibold transition-colors',
                active ? 'app-chrome-active' : 'app-chrome-control',
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
