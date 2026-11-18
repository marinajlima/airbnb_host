import type { AppData, MarketObservation, MarketStatus, MarketTier } from './types'

/* ---------- CSV import ---------- */

/** Minimal CSV parser: commas, double-quoted fields, "" escapes, \n or \r\n line ends. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((f) => f !== '')) rows.push(row)
      row = []
    } else field += c
  }
  row.push(field)
  if (row.some((f) => f !== '')) rows.push(row)
  return rows
}

/** Accepted column names: English, or the Portuguese ones the collector script writes. */
const COLUMNS = {
  snapshotDate: ['snapshot_date', 'data_coleta'],
  listingId: ['listing_id', 'id'],
  listingName: ['listing_name', 'apelido'],
  tier: ['tier', 'grupo'],
  window: ['window', 'janela'],
  checkIn: ['check_in'],
  checkOut: ['check_out'],
  guests: ['guests', 'adultos'],
  status: ['status', 'status_datas'],
  nightly: ['nightly', 'por_noite'],
  discount: ['discount', 'desconto_visivel'],
} as const

const TIER: Record<string, MarketTier> = {
  mine: 'mine', casa_sal: 'mine', own: 'mine',
  higher: 'higher', referencia: 'higher', reference: 'higher',
  lower: 'lower', comparavel: 'lower', similar: 'lower',
}

const STATUS: Record<string, MarketStatus> = {
  available: 'available', disponivel: 'available',
  unavailable: 'unavailable', indisponivel: 'unavailable',
  min_nights: 'min_nights', minimo_noites: 'min_nights',
}

export interface ImportResult {
  rows: MarketObservation[]
  skipped: number
  snapshots: string[]
  error?: string
}

export function importMarketCsv(text: string, propertyId: string): ImportResult {
  const table = parseCsv(text.replace(/^﻿/, ''))
  if (table.length < 2) return { rows: [], skipped: 0, snapshots: [], error: 'The file has no data rows.' }
  const header = table[0].map((h) => h.trim().toLowerCase())
  const col = {} as Record<keyof typeof COLUMNS, number>
  for (const [key, names] of Object.entries(COLUMNS) as [keyof typeof COLUMNS, readonly string[]][]) {
    col[key] = header.findIndex((h) => names.includes(h))
  }
  const missing = (Object.keys(COLUMNS) as (keyof typeof COLUMNS)[]).filter((k) => col[k] < 0 && k !== 'discount' && k !== 'listingId')
  if (missing.length) {
    return { rows: [], skipped: 0, snapshots: [], error: `Missing columns: ${missing.map((k) => COLUMNS[k][0]).join(', ')}.` }
  }

  const rows: MarketObservation[] = []
  let skipped = 0
  for (const r of table.slice(1)) {
    const get = (k: keyof typeof COLUMNS) => (col[k] >= 0 ? (r[col[k]] ?? '').trim() : '')
    const tier = TIER[get('tier').toLowerCase()]
    const status = STATUS[get('status').toLowerCase()]
    const nightly = Number(get('nightly'))
    if (!tier || !status || !/^\d{4}-\d{2}-\d{2}$/.test(get('checkIn'))) { skipped++; continue }
    rows.push({
      propertyId,
      snapshotDate: get('snapshotDate'),
      listingId: get('listingId') || get('listingName'),
      listingName: get('listingName'),
      tier,
      window: get('window') || get('checkIn'),
      checkIn: get('checkIn'),
      checkOut: get('checkOut'),
      guests: Number(get('guests')) || 0,
      status,
      nightly: status === 'available' && nightly > 0 ? nightly : undefined,
      discount: get('discount').toLowerCase() === 'true',
    })
  }
  const snapshots = [...new Set(rows.map((r) => r.snapshotDate))].sort()
  return { rows, skipped, snapshots }
}

/** Re-importing the same snapshot replaces it, so a corrected file never doubles the data. */
export function mergeMarket(existing: MarketObservation[], incoming: MarketObservation[]): MarketObservation[] {
  const replaced = new Set(incoming.map((r) => `${r.propertyId}|${r.snapshotDate}`))
  return [...existing.filter((r) => !replaced.has(`${r.propertyId}|${r.snapshotDate}`)), ...incoming]
}

/* ---------- Analysis ---------- */

export function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  const s = [...values].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export interface TierStats {
  median?: number
  available: number
  total: number
}

export interface WindowAnalysis {
  window: string
  checkIn: string
  checkOut: string
  mine?: MarketObservation
  lower: TierStats
  higher: TierStats
  /** Share of comparable listings with no availability for these dates. */
  soldOut: number
  comparables: number
  suggested?: number
  position: 'low' | 'middle' | 'high'
  /** 'thin' when a tier has fewer than two prices, or the cheaper tier costs more than the pricier one. */
  confidence: 'ok' | 'thin'
  observations: MarketObservation[]
}

function tierStats(obs: MarketObservation[]): TierStats {
  const priced = obs.filter((o) => o.nightly !== undefined).map((o) => o.nightly!)
  return { median: median(priced), available: priced.length, total: obs.length }
}

/**
 * Suggested nightly price for one window.
 * Start halfway between the lower and higher tier medians; move to a quarter of the way
 * when most comparables are free, and three quarters when most are sold out.
 */
export function suggest(lower?: number, higher?: number, soldOut = 0): { price?: number; position: WindowAnalysis['position'] } {
  const position = soldOut >= 0.6 ? 'high' : soldOut <= 0.25 ? 'low' : 'middle'
  const t = position === 'high' ? 0.75 : position === 'low' ? 0.25 : 0.5
  if (lower === undefined && higher === undefined) return { position }
  if (lower === undefined) return { price: Math.round((higher! * 0.85) / 10) * 10, position }
  if (higher === undefined) return { price: Math.round((lower * 1.15) / 10) * 10, position }
  return { price: Math.round((lower + (higher - lower) * t) / 10) * 10, position }
}

export function snapshotsFor(data: AppData, propertyId: string): string[] {
  return [...new Set(data.market.filter((m) => m.propertyId === propertyId).map((m) => m.snapshotDate))].sort()
}

export function guestCountsFor(data: AppData, propertyId: string, snapshot: string): number[] {
  return [...new Set(data.market.filter((m) => m.propertyId === propertyId && m.snapshotDate === snapshot).map((m) => m.guests))].sort((a, b) => a - b)
}

export function analyse(data: AppData, propertyId: string, snapshot: string, guests: number): WindowAnalysis[] {
  const obs = data.market.filter((m) => m.propertyId === propertyId && m.snapshotDate === snapshot && m.guests === guests)
  const byWindow = new Map<string, MarketObservation[]>()
  for (const o of obs) byWindow.set(o.window, [...(byWindow.get(o.window) ?? []), o])

  return [...byWindow.values()]
    .map((all) => {
      const list = oneRowPerListing(all)
      const comps = list.filter((o) => o.tier !== 'mine')
      const lower = tierStats(list.filter((o) => o.tier === 'lower'))
      const higher = tierStats(list.filter((o) => o.tier === 'higher'))
      const soldOut = comps.length ? comps.filter((o) => o.status === 'unavailable').length / comps.length : 0
      const { price, position } = suggest(lower.median, higher.median, soldOut)
      return {
        window: list[0].window,
        checkIn: list[0].checkIn,
        checkOut: list[0].checkOut,
        mine: list.find((o) => o.tier === 'mine'),
        lower,
        higher,
        soldOut,
        comparables: comps.length,
        suggested: price,
        position,
        confidence:
          lower.available < 2 || higher.available < 2 || (lower.median ?? 0) > (higher.median ?? Infinity) ? ('thin' as const) : ('ok' as const),
        observations: list.sort((a, b) => (b.nightly ?? 0) - (a.nightly ?? 0)),
      }
    })
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.checkOut.localeCompare(b.checkOut))
}

/**
 * A collector may retry a window with a longer stay for listings that require more nights.
 * Keep the main stay length for the window, and for a listing that only sells the longer stay,
 * use that row's price instead of counting it as not bookable.
 */
function oneRowPerListing(rows: MarketObservation[]): MarketObservation[] {
  const length = (o: MarketObservation) => `${o.checkIn}|${o.checkOut}`
  const counts = new Map<string, number>()
  for (const o of rows) counts.set(length(o), (counts.get(length(o)) ?? 0) + 1)
  const main = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]

  const byListing = new Map<string, MarketObservation[]>()
  for (const o of rows) byListing.set(o.listingId, [...(byListing.get(o.listingId) ?? []), o])
  return [...byListing.values()].map((own) => {
    const primary = own.find((o) => length(o) === main) ?? own[0]
    if (primary.status !== 'min_nights') return primary
    const longer = own.find((o) => o !== primary && o.status === 'available')
    return longer ? { ...longer, checkIn: primary.checkIn, checkOut: primary.checkOut, longerStay: true } : primary
  })
}

/** Median nightly price of all comparables in a snapshot, to show how the market moved. */
export function marketMedian(data: AppData, propertyId: string, snapshot: string, guests: number): number | undefined {
  return median(
    data.market
      .filter((m) => m.propertyId === propertyId && m.snapshotDate === snapshot && m.guests === guests && m.tier !== 'mine' && m.nightly !== undefined)
      .map((m) => m.nightly!),
  )
}
