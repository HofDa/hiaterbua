import { Card } from './card'

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
      <div className="text-sm text-neutral-700">{label}</div>
      <div className="mt-1 font-semibold text-neutral-950">{value}</div>
    </Card>
  )
}
