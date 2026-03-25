import type { ComponentProps } from 'react'

type AlertProps = ComponentProps<'div'> & {
  variant?: 'info' | 'success' | 'warning' | 'error'
}

export function Alert({ className = '', variant = 'info', children, ...props }: AlertProps) {
  const baseClasses = 'rounded-2xl border px-4 py-3 text-sm font-medium'
  
  const variantClasses = {
    info: 'border-[#ccb98a] bg-[#fffdf6] text-neutral-800',
    success: 'border-[#c5d3c8] bg-[#edf1ec] text-[#243228] font-semibold',
    warning: 'border-[#ccb98a] bg-[#efe4c8] text-neutral-900 font-semibold',
    error: 'border-red-200 bg-red-50 text-red-800'
  }
  
  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </div>
  )
}

export function StatusAlert({ className = '', ...props }: ComponentProps<'div'>) {
  return (
    <Alert variant="success" className={className} {...props} />
  )
}

export function ErrorAlert({ className = '', ...props }: ComponentProps<'div'>) {
  return (
    <Alert variant="error" className={className} {...props} />
  )
}

export function LoadingAlert({ className = '', ...props }: ComponentProps<'div'>) {
  return (
    <Alert variant="warning" className={className} {...props} />
  )
}
