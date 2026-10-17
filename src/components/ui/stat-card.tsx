/**
 * A read-only value: plain label over value, no border. Boxed values read as
 * buttons next to the app's outlined controls.
 */
export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0">
      <div className="text-sm font-medium text-ink-muted">{label}</div>
      <div className="mt-0.5 text-lg font-bold tabular-nums text-ink-strong [overflow-wrap:anywhere]">
        {value}
      </div>
    </div>
  )
}
