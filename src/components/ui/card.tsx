import { cn } from '@/lib/utils/cn'
import type { ComponentProps } from 'react'

type CardProps = ComponentProps<'div'> & {
  variant?: 'default' | 'compact' | 'dashboard'
}

export function Card({ className, variant = 'default', ...props }: CardProps) {
  const variantClasses = {
    default: 'p-5',
    compact: 'p-4',
    dashboard: 'p-5',
  }
  
  return (
    <div
      className={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({
  className,
  ...props
}: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
}

export function CardTitle({
  className,
  ...props
}: ComponentProps<'h2'>) {
  return (
    <h2
      className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
}

export function CardDescription({
  className,
  ...props
}: ComponentProps<'p'>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function CardContent({
  className,
  ...props
}: ComponentProps<'div'>) {
  return <div className={cn('p-6 pt-0', className)} {...props} />
}

export function CardFooter({
  className,
  ...props
}: ComponentProps<'div'>) {
  return <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
}
