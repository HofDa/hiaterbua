import { cva, type VariantProps } from 'class-variance-authority'
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive:
          'border-error-border bg-error-surface text-error-ink [&>svg]:text-error-ink',
        success:
          'border-success-border bg-success-surface text-success-ink [&>svg]:text-success-ink',
        info:
          'border-info-border bg-info-surface text-info-ink [&>svg]:text-info-ink',
        warning:
          'border-warning-border bg-warning-surface text-warning-ink [&>svg]:text-warning-ink',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

type AlertProps = ComponentProps<'div'> & VariantProps<typeof alertVariants>

export function Alert({ className, variant, children, ...props }: AlertProps) {
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

type StatusAlertProps = ComponentProps<'div'> & {
  variant?: 'success' | 'warning' | 'info'
  icon?: ReactNode
}

const statusTitles: Record<'success' | 'warning' | 'info', string> = {
  success: 'Erfolg',
  warning: 'Warnung',
  info: 'Info',
}

export function StatusAlert({
  className,
  children,
  variant = 'success',
  icon,
  ...props
}: StatusAlertProps) {
  const DefaultIcon =
    variant === 'warning' ? AlertCircle : variant === 'info' ? Info : CheckCircle

  return (
    <Alert variant={variant} className={className} {...props}>
      {icon ?? <DefaultIcon className="h-4 w-4" />}
      <AlertTitle>{statusTitles[variant]}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

export function ErrorAlert({ className, children, ...props }: ComponentProps<'div'>) {
  return (
    <Alert variant="destructive" className={className} {...props}>
      <XCircle className="h-4 w-4" />
      <AlertTitle>Fehler</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

export function LoadingAlert({ className, children, ...props }: ComponentProps<'div'>) {
  return (
    <Alert variant="default" className={className} {...props}>
      <Info className="h-4 w-4" />
      <AlertTitle>Wird geladen</AlertTitle>
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
