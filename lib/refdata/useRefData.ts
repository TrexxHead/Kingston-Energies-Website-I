'use client'

import { useEffect, useState } from 'react'
import type { PublicRecord, RefKind } from './types'

/** The approved record of a kind in effect today (null = none approved; undefined = still loading). */
export function useActiveRecord<K extends RefKind>(kind: K, match?: string): { record: PublicRecord<K> | null | undefined; failed: boolean } {
  const [record, setRecord] = useState<PublicRecord<K> | null | undefined>(undefined)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const qs = new URLSearchParams({ kind, ...(match ? { match } : {}) })
    fetch(`/api/refdata?${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setRecord(d.record))
      .catch(() => {
        setFailed(true)
        setRecord(null)
      })
  }, [kind, match])
  return { record, failed }
}
