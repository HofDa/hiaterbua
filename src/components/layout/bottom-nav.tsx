'use client'

import { Briefcase, Home, Map, MapPin, Users, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { useHapticFeedback } from '@/hooks/use-haptic-feedback'
import { isNavItemActive } from './nav-active'

type MobileNavItem = {
  href: string
  label: string
  icon: LucideIcon
}

const mobileNavItems: MobileNavItem[] = [
  { href: '/', label: 'Start', icon: Home },
  { href: '/work', label: 'Arbeit', icon: Briefcase },
  { href: '/sessions', label: 'Weide', icon: Map },
  { href: '/enclosures', label: 'Pferche', icon: MapPin },
  { href: '/herds', label: 'Herde', icon: Users },
]

export function BottomNav() {
  const pathname = usePathname()
  const triggerHaptic = useHapticFeedback()

  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-chrome-border bg-chrome-shell app-chrome-bottom md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1 px-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2">
        {mobileNavItems.map((item) => {
          const active = isNavItemActive(pathname, item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              onClick={() => triggerHaptic('light')}
              className={cn(
                'flex h-16 min-w-0 flex-col items-center justify-center rounded-[1.1rem] border px-1.5 text-center transition-colors',
                active ? 'app-chrome-active' : 'app-chrome-control',
              )}
            >
              <Icon aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={2.2} />
              <span className="mt-1 max-w-full truncate text-[0.68rem] font-semibold leading-none">
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
