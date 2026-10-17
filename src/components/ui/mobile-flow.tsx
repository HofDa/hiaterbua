import type { ComponentProps, ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { MetaLabel } from '@/components/ui/typography'

type FlowStepHeaderProps = Omit<ComponentProps<'div'>, 'children'> & {
  label: string
  sublabel: string
  onBack: () => void
  backLabel?: string
  buttonClassName?: string
  labelClassName?: string
  sublabelClassName?: string
}

export function FlowStepHeader({
  label,
  sublabel,
  onBack,
  backLabel = 'Zurück',
  className,
  buttonClassName,
  labelClassName,
  sublabelClassName,
  ...props
}: FlowStepHeaderProps) {
  return (
    <div
      className={cn('flex items-center justify-between gap-3 app-callout px-3.5 py-3', className)}
      {...props}
    >
      <button
        type="button"
        onClick={onBack}
        className={cn(
          'shrink-0 rounded-full border border-border-strong bg-surface-raised px-3 py-1.5 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          buttonClassName,
        )}
      >
        {backLabel}
      </button>
      <div className="min-w-0 text-right">
        <div
          className={cn(
            'text-sm font-semibold leading-tight hyphens-auto break-words',
            labelClassName,
          )}
        >
          {label}
        </div>
        <div
          className={cn(
            'mt-0.5 text-xs font-medium leading-tight text-ink-muted',
            sublabelClassName,
          )}
        >
          {sublabel}
        </div>
      </div>
    </div>
  )
}

type FlowOptionGridProps = ComponentProps<'div'> & {
  layout?: 'single' | 'two'
}

export function FlowOptionGrid({
  className,
  layout = 'two',
  ...props
}: FlowOptionGridProps) {
  return (
    <div
      className={cn(layout === 'two' ? 'grid grid-cols-2 gap-3' : 'grid gap-3', className)}
      {...props}
    />
  )
}

type FlowSelectableTileProps = ComponentProps<'button'> & {
  /**
   * Selection state for choice tiles. Omit for navigation tiles (a list whose
   * tap moves to the next step): they carry no selected look, so the last
   * tapped row is never mistaken for a choice.
   */
  pressed?: boolean
  selectedClassName?: string
  idleClassName?: string
}

function renderSelectableTileContent(children: ReactNode) {
  if (typeof children === 'string' || typeof children === 'number') {
    return <span className="block hyphens-auto break-words">{children}</span>
  }

  return children
}

/**
 * The one "selected" look for every segmented tab, filter and preset in the
 * app (choice tiles add a check badge on top). Four different selected styles
 * — grey fill, yellow, dark green, pills — made state hard to read in sun.
 */
export const selectedChoiceClassName =
  'border-2 border-primary bg-accent font-bold text-ink-strong shadow-[inset_0_0_0_1px_var(--brand-dark)]'
export const idleChoiceClassName = 'border border-border bg-surface-raised font-semibold text-ink'

// Selected = green 3px edge + check badge, not a beige tint: tint alone
// vanished in direct sun, and the same tint also meant "preselected" and
// "last tapped" across the app.
const selectedTileClassName =
  'border-primary bg-accent text-ink-strong shadow-[inset_0_0_0_1px_var(--brand-dark)]'

export function FlowSelectableTile({
  pressed,
  selectedClassName = selectedTileClassName,
  idleClassName = 'border-border bg-surface-raised text-ink',
  className,
  children,
  type = 'button',
  ...props
}: FlowSelectableTileProps) {
  const isChoice = pressed !== undefined

  return (
    <button
      {...props}
      type={type}
      aria-pressed={pressed}
      className={cn(
        'relative min-h-[4.25rem] min-w-0 break-words rounded-[1.25rem] border-2 px-4 py-3.5 text-left text-sm font-semibold leading-tight whitespace-normal app-shadow-action transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50',
        isChoice && 'pr-12',
        pressed ? selectedClassName : idleClassName,
        className,
      )}
    >
      {renderSelectableTileContent(children)}
      {pressed ? (
        <span
          aria-hidden="true"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
      ) : null}
    </button>
  )
}

export function FlowEmptyState({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-[1.35rem] border-2 border-dashed border-border bg-surface-raised px-4 py-4 text-sm text-ink-muted',
        className,
      )}
      {...props}
    />
  )
}

type FlowSummaryCalloutProps = Omit<ComponentProps<'div'>, 'children'> & {
  label: string
  sublabel: string
}

export function FlowSummaryCallout({
  label,
  sublabel,
  className,
  ...props
}: FlowSummaryCalloutProps) {
  return (
    <div className={cn('app-callout px-3.5 py-3 text-right', className)} {...props}>
      <div className="text-sm font-semibold leading-tight hyphens-auto break-words">
        {label}
      </div>
      <div className="mt-0.5 text-xs font-medium leading-tight text-ink-muted">
        {sublabel}
      </div>
    </div>
  )
}

type FlowCountCardProps = Omit<ComponentProps<'div'>, 'children'> & {
  label: string
  value: ReactNode
  valueClassName?: string
}

export function FlowCountCard({
  label,
  value,
  className,
  valueClassName,
  ...props
}: FlowCountCardProps) {
  return (
    <div
      className={cn(
        'col-span-2 rounded-[1.35rem] border-2 border-border bg-surface-raised px-4 py-4 text-center app-shadow-action',
        className,
      )}
      {...props}
    >
      <MetaLabel weight="medium" tracking="compact">
        {label}
      </MetaLabel>
      <div className={cn('mt-2 text-4xl font-semibold text-ink-strong', valueClassName)}>
        {value}
      </div>
    </div>
  )
}

export function FlowStepperButton({
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'>) {
  return (
    <button
      type={type}
      className={cn(
        'min-h-[4.75rem] rounded-[1.3rem] border-2 border-border-strong bg-surface-muted px-4 py-4 text-3xl font-semibold text-ink app-shadow-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-40',
        className,
      )}
      {...props}
    />
  )
}

export function FlowPrimaryAction({
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'>) {
  return (
    <button
      type={type}
      className={cn(
        // The one filled, dark-green action per step — the next thing to do.
        'w-full min-h-[4.75rem] rounded-[1.35rem] border-2 border-primary bg-primary px-4 py-4 text-lg font-bold text-primary-foreground app-shadow-action-strong transition-colors hover:bg-chrome-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:border-dashed disabled:border-border-soft disabled:bg-surface-disabled-strong disabled:font-semibold disabled:text-ink-muted disabled:shadow-none',
        className,
      )}
      {...props}
    />
  )
}

export function FlowSecondaryAction({
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'>) {
  return (
    <button
      type={type}
      className={cn(
        'w-full rounded-[1.1rem] border border-border bg-surface-raised px-4 py-3 text-sm font-semibold text-ink-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        className,
      )}
      {...props}
    />
  )
}
