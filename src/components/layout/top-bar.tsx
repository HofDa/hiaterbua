'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { metaLabelClassName } from '@/components/ui/typography'
import { cn } from '@/lib/utils/cn'
import { navItems } from './nav-items'

export function TopBar() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-30 border-b border-chrome-border bg-chrome-shell text-white app-chrome-top">
      <div className="mx-auto flex min-h-18 max-w-6xl items-center justify-between gap-4 px-4 py-3 xl:max-w-[88rem]">
        <div className="shrink-0">
          <p className="text-lg font-semibold tracking-[-0.02em] text-white">Pastore 1.0</p>
          <p
            className={metaLabelClassName(
              { tracking: 'wider', tone: 'inherit', weight: 'normal' },
              'text-chrome-muted',
            )}
          >
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
