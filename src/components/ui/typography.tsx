import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils/cn'

type MetaLabelSize = 'nano' | 'micro' | 'xs' | 'sm'
type MetaLabelTone = 'muted' | 'soft' | 'strong' | 'error' | 'ink' | 'inherit'
type MetaLabelTracking = 'tight' | 'compact' | 'normal' | 'wide' | 'wider' | 'widest'
type MetaLabelWeight = 'normal' | 'medium' | 'semibold'

type MetaLabelOptions = {
  size?: MetaLabelSize
  tone?: MetaLabelTone
  tracking?: MetaLabelTracking
  weight?: MetaLabelWeight
}

const metaLabelSizeClasses: Record<MetaLabelSize, string> = {
  nano: 'text-[10px]',
  micro: 'text-[11px]',
  xs: 'text-xs',
  sm: 'text-sm',
}

const metaLabelToneClasses: Record<MetaLabelTone, string> = {
  muted: 'text-ink-muted',
  soft: 'text-ink-soft',
  strong: 'text-ink-strong',
  error: 'text-error-ink',
  ink: 'text-ink',
  inherit: '',
}

const metaLabelTrackingClasses: Record<MetaLabelTracking, string> = {
  tight: 'tracking-[0.04em]',
  compact: 'tracking-[0.08em]',
  normal: 'tracking-[0.12em]',
  wide: 'tracking-[0.14em]',
  wider: 'tracking-[0.16em]',
  widest: 'tracking-[0.18em]',
}

const metaLabelWeightClasses: Record<MetaLabelWeight, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
}

export function metaLabelClassName(
  {
    size = 'xs',
    tone = 'muted',
    tracking = 'normal',
    weight = 'semibold',
  }: MetaLabelOptions = {},
  className?: string,
) {
  return cn(
    'uppercase',
    metaLabelSizeClasses[size],
    metaLabelWeightClasses[weight],
    metaLabelTrackingClasses[tracking],
    metaLabelToneClasses[tone],
    className,
  )
}

type MetaLabelProps = ComponentProps<'div'> & MetaLabelOptions

export function MetaLabel({
  className,
  size,
  tone,
  tracking,
  weight,
  ...props
}: MetaLabelProps) {
  return (
    <div
      className={metaLabelClassName({ size, tone, tracking, weight }, className)}
      {...props}
    />
  )
}
