'use client'

import { Download, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { metaLabelClassName } from '@/components/ui/typography'
import { APP_TITLE } from '@/lib/app-metadata'
import { cn } from '@/lib/utils/cn'
import { isNavItemActive } from './nav-active'
import { navItems } from './nav-items'

export function TopBar() {
  const pathname = usePathname()
  const activeItem = navItems.find((item) => isNavItemActive(pathname, item.href))
  const utilityActions = [
    { href: '/export', label: 'Im-/Export', icon: Download },
    { href: '/settings', label: 'Einstellungen', icon: Settings },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-chrome-border bg-chrome-shell pt-[env(safe-area-inset-top)] text-white app-chrome-top">
      <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-3 px-3 py-1.5 md:min-h-18 md:gap-4 md:px-4 md:py-3 xl:max-w-[88rem]">
        {/* Installed standalone use means the user already knows which app is
            open — on mobile the page title is the header, not the app name. */}
        <p className="min-w-0 truncate text-lg font-semibold text-white md:hidden">
          {activeItem?.label ?? APP_TITLE}
        </p>
        <div className="hidden min-w-0 shrink md:block">
          <p className="truncate text-lg font-semibold text-white">{APP_TITLE}</p>
          <p
            className={metaLabelClassName(
              { tracking: 'wider', tone: 'inherit', weight: 'normal' },
              'text-chrome-muted',
            )}
          >
            Offlinefähige Felddokumentation
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:hidden">
          {utilityActions.map((item) => {
            const active = isNavItemActive(pathname, item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                title={item.label}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full border transition-colors',
                  active ? 'app-chrome-active' : 'app-chrome-control',
                )}
              >
                <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={2.2} />
              </Link>
            )
          })}
        </div>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => {
            const active = isNavItemActive(pathname, item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                  active
                    ? 'app-chrome-active'
                    : 'app-chrome-control hover:bg-surface-hover',
                )}
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
