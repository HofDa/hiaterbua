import type { ComponentProps } from 'react'

type CardProps = ComponentProps<'div'> & {
  variant?: 'default' | 'compact' | 'dashboard'
}

export function Card({ className = '', variant = 'default', ...props }: CardProps) {
  const baseClasses = 'rounded-2xl border-2 border-[#3a342a] bg-[#fff8ea] shadow-[0_18px_40px_rgba(40,34,26,0.08)]'
  
  const variantClasses = {
    default: 'p-5',
    compact: 'p-4',
    dashboard: 'p-5'
  }
  
  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
}

export function CardHeader({ className = '', ...props }: ComponentProps<'div'>) {
  return (
    <div className={`space-y-2 ${className}`} {...props} />
  )
}

export function CardTitle({ className = '', ...props }: ComponentProps<'h2'>) {
  return (
    <h2 className={`text-lg font-semibold tracking-[-0.02em] ${className}`} {...props} />
  )
}

export function CardDescription({ className = '', ...props }: ComponentProps<'p'>) {
  return (
    <p className={`text-sm font-medium text-neutral-800 ${className}`} {...props} />
  )
}

export function CardContent({ className = '', ...props }: ComponentProps<'div'>) {
  return (
    <div className={`mt-4 space-y-4 ${className}`} {...props} />
  )
}
