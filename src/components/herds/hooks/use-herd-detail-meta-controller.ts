'use client'

import { useState } from 'react'
import { deleteHerdCascade } from '@/lib/db/delete-herd'
import { safeString } from '@/lib/herds/herd-detail-helpers'
import { nowIso } from '@/lib/utils/time'
import { db } from '@/lib/db/dexie'
import type { Herd } from '@/types/domain'

type UseHerdDetailMetaControllerOptions = {
  herd: Herd
  onDeleted: () => void
}

export function useHerdDetailMetaController({
  herd,
  onDeleted,
}: UseHerdDetailMetaControllerOptions) {
  const [metaName, setMetaName] = useState(herd.name)
  const [metaFallbackCount, setMetaFallbackCount] = useState(
    herd.fallbackCount === null || herd.fallbackCount === undefined
      ? ''
      : String(herd.fallbackCount)
  )
  const [metaNotes, setMetaNotes] = useState(herd.notes ?? '')
  const [metaSaving, setMetaSaving] = useState(false)
  const [metaSaved, setMetaSaved] = useState(false)

  const metaDirty =
    metaName.trim() !== safeString(herd.name) ||
    metaFallbackCount !==
      (herd.fallbackCount === null || herd.fallbackCount === undefined
        ? ''
        : String(herd.fallbackCount)) ||
    metaNotes.trim() !== safeString(herd.notes)

  async function deleteHerd() {
    const confirmed = window.confirm(
      `Herde "${herd.name}" wirklich löschen? Tiere, Weidegänge, Arbeitseinsätze und Belegungen dieser Herde werden ebenfalls entfernt.`
    )

    if (!confirmed) return

    await deleteHerdCascade(herd.id)
    onDeleted()
  }

  async function saveHerdMeta(event: React.FormEvent) {
    event.preventDefault()
    if (!metaName.trim()) return

    setMetaSaving(true)
    setMetaSaved(false)

    await db.herds.update(herd.id, {
      name: metaName.trim(),
      fallbackCount: metaFallbackCount.trim() ? Number(metaFallbackCount) : null,
      notes: metaNotes.trim() || undefined,
      updatedAt: nowIso(),
    })

    setMetaSaving(false)
    setMetaSaved(true)
  }

  return {
    metaName,
    metaFallbackCount,
    metaNotes,
    metaSaving,
    metaSaved,
    metaDirty,
    setMetaName,
    setMetaFallbackCount,
    setMetaNotes,
    deleteHerd,
    saveHerdMeta,
  }
}
