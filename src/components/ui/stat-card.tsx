import { Card } from './card'

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="rounded-[1.1rem] border-border bg-surface-raised px-4 py-3 shadow-sm">
      <div className="text-sm text-ink-muted">{label}</div>
      <div className="mt-1 font-semibold text-ink-strong">{value}</div>
    </Card>
  )
}
