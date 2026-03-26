'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { navItems } from './nav-items'

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="sticky bottom-0 z-30 border-t border-[#061a14] bg-[linear-gradient(180deg,#123a2d,#0c281f)] shadow-[0_-16px_36px_rgba(8,23,17,0.34)] md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-2 px-3 py-3">
        {navItems.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-2xl border px-3 py-3 text-center text-sm font-semibold shadow-sm transition-colors',
                active
                  ? 'border-white bg-[#2f6b4d] text-white shadow-[0_12px_28px_rgba(9,28,20,0.28)]'
                  : 'border-[#0a2018] bg-[#fffdf8] text-[#111111] shadow-[0_8px_18px_rgba(9,28,20,0.16)]',
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
