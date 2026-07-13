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
      {/* Flat native-style tab bar: the active tab gets an icon pill, inactive
          tabs stay flat — no bordered boxes, so the bar can sit lower and read
          as chrome rather than content. Height feeds --app-bottom-nav-height. */}
      <div className="mx-auto grid max-w-md grid-cols-5 px-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-1">
        {mobileNavItems.map((item) => {
          const active = isNavItemActive(pathname, item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              onClick={() => triggerHaptic('light')}
              className="flex h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 text-center transition-colors"
            >
              <span
                className={cn(
                  'flex h-7 w-12 shrink-0 items-center justify-center rounded-full border border-transparent transition-colors',
                  active ? 'app-chrome-active' : 'text-chrome-muted',
                )}
              >
                <Icon aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={2.2} />
              </span>
              <span
                className={cn(
                  'max-w-full truncate text-[0.68rem] font-semibold leading-none',
                  active ? 'text-white' : 'text-chrome-muted',
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
