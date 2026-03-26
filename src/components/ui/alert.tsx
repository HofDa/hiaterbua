import { cva, type VariantProps } from 'class-variance-authority'
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils/cn'

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive:
          'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        success: 'border-green-500/50 text-green-500 dark:border-green-500 [&>svg]:text-green-500',
        info: 'border-blue-200 bg-blue-50 text-blue-800 [&>svg]:text-blue-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

type AlertProps = ComponentProps<'div'> & VariantProps<typeof alertVariants>

export function Alert({
  className,
  variant,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function StatusAlert({
  className,
  children,
  ...props
}: ComponentProps<'div'>) {
  return (
    <Alert variant="success" className={cn(className)} {...props}>
      <CheckCircle className="h-4 w-4" />
      <AlertTitle>Success</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

export function ErrorAlert({
  className,
  children,
  ...props
}: ComponentProps<'div'>) {
  return (
    <Alert variant="destructive" className={cn(className)} {...props}>
      <XCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

export function LoadingAlert({
  className,
  children,
  ...props
}: ComponentProps<'div'>) {
  return (
    <Alert variant="default" className={cn(className)} {...props}>
      <Info className="h-4 w-4" />
      <AlertTitle>Loading</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

function AlertTitle({ className, ...props }: ComponentProps<'h5'>) {
  return (
    <h5
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
}
