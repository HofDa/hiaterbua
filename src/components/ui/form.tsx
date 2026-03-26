import * as FormPrimitive from '@radix-ui/react-form'
import type { ComponentProps } from 'react'
import {
  type ElementRef,
  forwardRef,
  type HTMLAttributes,
} from 'react'
import { cn } from '@/lib/utils/cn'

// ---------------------------------------------------------------------------
// Form-aware primitive wrappers
// ---------------------------------------------------------------------------

const formInputBase =
  'w-full rounded-[1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-3.5 py-2.5 text-sm shadow-sm sm:rounded-[1.1rem] sm:px-4 sm:py-3 sm:text-base'

export function FormInput({ className = '', ...props }: ComponentProps<'input'>) {
  return <input className={cn(formInputBase, className)} {...props} />
}

export function FormSelect({ className = '', ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(formInputBase, className)}
      {...props}
    />
  )
}

export function FormTextarea({ className = '', ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(formInputBase, 'min-h-[5rem] resize-y', className)}
      {...props}
    />
  )
}

type FormButtonVariant = 'primary' | 'secondary' | 'danger'

type FormButtonProps = ComponentProps<'button'> & {
  variant?: FormButtonVariant
}

const formButtonVariants: Record<FormButtonVariant, string> = {
  primary:
    'border-[#5a5347] bg-[#f1efeb] text-[#17130f] shadow-[0_12px_24px_rgba(40,34,26,0.08)]',
  secondary:
    'border-[#ccb98a] bg-[#fffdf6] text-neutral-950',
  danger:
    'border-red-200 bg-red-50 text-red-800',
}

export function FormButton({
  className = '',
  variant = 'primary',
  ...props
}: FormButtonProps) {
  return (
    <button
      className={cn(
        'rounded-[1.1rem] border px-4 py-3 text-sm font-semibold shadow-sm disabled:opacity-50',
        formButtonVariants[variant],
        className,
      )}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// ToggleButton — repeated selected/unselected card-style toggle
// ---------------------------------------------------------------------------

type ToggleButtonProps = ComponentProps<'button'> & {
  pressed: boolean
}

export function ToggleButton({
  className = '',
  pressed,
  children,
  ...props
}: ToggleButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        'min-h-[4.25rem] rounded-[1.25rem] border-2 px-4 py-3.5 text-left text-sm font-semibold leading-tight whitespace-normal shadow-[0_12px_24px_rgba(40,34,26,0.08)] transition-colors',
        pressed
          ? 'border-[#5a5347] bg-[#efe4c8] text-[#17130f]'
          : 'border-[#ccb98a] bg-[#fffdf6] text-neutral-900',
        className,
      )}
      {...props}
    >
      <span className="block [overflow-wrap:anywhere]">{children}</span>
    </button>
  )
}

export const Form = FormPrimitive.Root

type FormFieldProps = HTMLAttributes<HTMLDivElement> & {
  name?: string
}

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('space-y-2', className)}
        {...props}
      />
    )
  },
)
FormField.displayName = 'FormField'

export const FormLabel = forwardRef<
  HTMLLabelElement,
  ComponentProps<'label'>
>(({ className, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={cn('text-sm font-medium', className)}
      {...props}
    />
  )
})
FormLabel.displayName = 'FormLabel'

export const FormControl = forwardRef<
  ElementRef<typeof FormPrimitive.Control>,
  ComponentProps<typeof FormPrimitive.Control>
>(({ ...props }, ref) => {
  return <FormPrimitive.Control ref={ref} {...props} />
})
FormControl.displayName = 'FormControl'

export const FormDescription = forwardRef<
  ElementRef<typeof FormPrimitive.Message>,
  ComponentProps<typeof FormPrimitive.Message>
>(({ className, ...props }, ref) => {
  return (
    <FormPrimitive.Message
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
})
FormDescription.displayName = 'FormDescription'

export const FormMessage = forwardRef<
  ElementRef<typeof FormPrimitive.Message>,
  ComponentProps<typeof FormPrimitive.Message>
>(({ className, children, ...props }, ref) => {
  const body = children ? String(children) : null

  if (!body) {
    return null
  }
  
  return (
    <FormPrimitive.Message
      ref={ref}
      className={cn('text-sm font-medium text-destructive', className)}
      {...props}
    >
      {body}
    </FormPrimitive.Message>
  )
})
FormMessage.displayName = 'FormMessage'

