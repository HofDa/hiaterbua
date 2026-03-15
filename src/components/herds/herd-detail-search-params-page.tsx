'use client'

import { useSearchParams } from 'next/navigation'
import { HerdDetailRoutePage } from '@/components/herds/herd-detail-route-page'

export function HerdDetailSearchParamsPage() {
  const searchParams = useSearchParams()
  const herdId = searchParams.get('id')?.trim() || null

  return <HerdDetailRoutePage herdId={herdId} />
}
