'use client'

type HerdDetailHeaderCardProps = {
  isArchived: boolean
  activeAnimalsCount: number
  effectiveHerdCount: number | null
  currentEnclosureName: string | null
  metaName: string
  metaFallbackCount: string
  metaNotes: string
  metaDirty: boolean
  metaSaving: boolean
  metaSaved: boolean
  onMetaNameChange: (value: string) => void
  onMetaFallbackCountChange: (value: string) => void
  onMetaNotesChange: (value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>
  onBack: () => void
  onDelete: () => void | Promise<void>
}

export function HerdDetailHeaderCard({
  isArchived,
  activeAnimalsCount,
  effectiveHerdCount,
  currentEnclosureName,
  metaName,
  metaFallbackCount,
  metaNotes,
  metaDirty,
  metaSaving,
  metaSaved,
  onMetaNameChange,
  onMetaFallbackCountChange,
  onMetaNotesChange,
  onSubmit,
  onBack,
  onDelete,
}: HerdDetailHeaderCardProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-700">
            Herde
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-neutral-950 shadow-sm"
          >
            Zurück
          </button>
          <button
            type="button"
            onClick={() => void onDelete()}
            className="rounded-[1.1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 shadow-sm"
          >
            Herde löschen
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
            Name
          </label>
          <input
            className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-2xl font-semibold tracking-[-0.02em] shadow-sm"
            value={metaName}
            onChange={(event) => onMetaNameChange(event.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
              Geschätzte Anzahl (optional)
            </label>
            <input
              type="number"
              min="0"
              className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
              value={metaFallbackCount}
              onChange={(event) => onMetaFallbackCountChange(event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
              Notiz
            </label>
            <input
              className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
              value={metaNotes}
              onChange={(event) => onMetaNotesChange(event.target.value)}
              placeholder="optionale Bemerkung"
            />
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
          <div className="text-neutral-700">Aktive Tiere</div>
          <div className="mt-1 font-semibold text-neutral-950">
            {activeAnimalsCount || effectiveHerdCount || 0}
          </div>
        </div>
        <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
          <div className="text-neutral-700">Aktiver Pferch</div>
          <div className="mt-1 font-semibold text-neutral-950">
            {currentEnclosureName ?? 'Keiner'}
          </div>
        </div>
        <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
          <div className="text-neutral-700">Status</div>
          <div className="mt-1 font-semibold text-neutral-950">
            {isArchived ? 'Archiviert' : 'Aktiv'}
          </div>
        </div>
      </div>
      {metaDirty ? (
        <div className="mt-4">
          <button
            type="submit"
            disabled={metaSaving}
            className="rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-3 text-sm font-semibold text-neutral-950 shadow-sm"
          >
            {metaSaving ? 'Speichert …' : 'Änderungen speichern'}
          </button>
        </div>
      ) : null}
      {metaSaved ? (
        <div className="mt-3 rounded-[1.1rem] border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-900">
          Herdendaten gespeichert.
        </div>
      ) : null}
    </form>
  )
}
