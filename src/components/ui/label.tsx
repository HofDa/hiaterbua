import { cva, type VariantProps } from 'class-variance-authority'
import type { LabelHTMLAttributes } from 'react'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
)

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement> &
  VariantProps<typeof labelVariants>

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label ref={ref} className={cn(labelVariants(), className)} {...props} />
  ),
)
Label.displayName = 'Label'
