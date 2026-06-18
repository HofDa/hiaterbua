import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  actionButton?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  actionButton,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center text-ink-soft', className)}>
      {icon || <Info className="h-12 w-12 text-ink-soft mb-4" />}
      <h3 className="text-xl font-semibold text-ink-muted mb-2">{title}</h3>
      {description && <p className="text-sm mb-4 max-w-sm">{description}</p>}
      {actionButton && <div className="mt-4">{actionButton}</div>}
    </div>
  )
}
