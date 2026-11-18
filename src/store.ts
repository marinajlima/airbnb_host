import { useEffect, useState } from 'react'
import type { AppData } from './types'
import { makeSeed } from './seed'

const KEY = 'stayops:v1'

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppData
      if (parsed.version === 1) return parsed
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
