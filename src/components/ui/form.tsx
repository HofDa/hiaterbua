import type { ComponentProps } from 'react'

export function FormField({ className = '', ...props }: ComponentProps<'div'>) {
  return (
    <div className={`space-y-2 ${className}`} {...props} />
  )
}

export function FormLabel({ className = '', ...props }: ComponentProps<'label'>) {
  return (
    <label className={`block text-sm font-medium text-neutral-900 ${className}`} {...props} />
  )
}

export function FormSelect({ className = '', ...props }: ComponentProps<'select'>) {
  return (
    <select 
      className={`w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-neutral-950 ${className}`}
      {...props}
    />
  )
}

export function FormInput({ className = '', ...props }: ComponentProps<'input'>) {
  return (
    <input 
      className={`w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-neutral-950 ${className}`}
      {...props}
    />
  )
}

export function FormTextarea({ className = '', ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea 
      className={`w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-neutral-950 ${className}`}
      {...props}
    />
  )
}

export function FormButton({ 
  className = '', 
  variant = 'primary',
  ...props 
}: ComponentProps<'button'> & { variant?: 'primary' | 'secondary' }) {
  const baseClasses = 'rounded-2xl border px-4 py-4 font-semibold disabled:opacity-50'
  
  const variantClasses = {
    primary: 'border-[#5a5347] bg-[#f1efeb] text-[#17130f]',
    secondary: 'border-[#ccb98a] bg-[#fffdf6] text-[#17130f]'
  }
  
  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
}
