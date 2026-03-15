'use client'

import { useSearchParams } from 'next/navigation'
import { HerdEditRoutePage } from '@/components/herds/herd-edit-route-page'

export function HerdEditSearchParamsPage() {
  const searchParams = useSearchParams()
  const herdId = searchParams.get('id')?.trim() || null

  return <HerdEditRoutePage herdId={herdId} />
}
