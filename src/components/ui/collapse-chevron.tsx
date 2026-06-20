import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type CollapseChevronProps = {
  /** Whether the collapsible is open (chevron points up when true). */
  open: boolean
  className?: string
}

/** Shared collapse affordance so every expand/collapse toggle reads the same. */
export function CollapseChevron({ open, className }: CollapseChevronProps) {
  return (
    <ChevronDown
      aria-hidden="true"
      className={cn(
        'h-4 w-4 shrink-0 text-ink transition-transform',
        open && 'rotate-180',
        className,
      )}
    />
  )
}
