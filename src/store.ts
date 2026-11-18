import { useEffect, useState } from 'react'
import type { AppData } from './types'
import { makeSeed } from './seed'
import { cleaningFor } from './finance'

/** Data saved before Layer 2 had no costs: create the cleaning cost for each existing stay. */
type V3 = Omit<AppData, 'version' | 'market'> & { version: 3 }
type V2 = Omit<V3, 'version' | 'incidents' | 'playbook'> & { version: 2 }

/** Layer 4 added market snapshots, empty until the first import. */
function migrateV3(old: V3): AppData {
  return { ...old, version: 4, market: [] }
}

/** Layer 3 added the incident log and playbook, both empty for existing data. */
function migrateV2(old: V2): V3 {
  return { ...old, version: 3, incidents: [], playbook: [] }
}

function migrateV1(old: Omit<V2, 'version' | 'expenses'>): V2 {
  const props = new Map(old.properties.map((p) => [p.id, p]))
  const expenses = old.reservations.flatMap((r) => {
    const p = props.get(r.propertyId)
    return p && p.cleaningCost > 0 ? [cleaningFor(r, p)] : []
  })
  return { ...old, version: 2, expenses }
}

const KEY = 'stayops:v1'

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === 4) return parsed as AppData
      if (parsed.version === 3) return migrateV3(parsed)
      if (parsed.version === 2) return migrateV3(migrateV2(parsed))
      if (parsed.version === 1) return migrateV3(migrateV2(migrateV1(parsed)))
    }
  } catch {
    // storage unavailable or corrupted: fall back to demo data
  }
  return makeSeed()
}

/**
 * Layer 1 keeps everything in the browser (localStorage).
 * Your data never leaves your device; a later layer swaps this for a database.
 */
export function useAppData() {
  const [data, setData] = useState<AppData>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      // ignore quota or privacy-mode errors
    }
  }, [data])

  const resetDemo = () => setData(makeSeed())

  return { data, setData, resetDemo }
}
