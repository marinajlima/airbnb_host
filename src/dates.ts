const DAY = 86_400_000

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function isoOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function today(): string {
  return isoOf(new Date())
}

export function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`)
}

export function addDays(iso: string, n: number): string {
  const d = toDate(iso)
  d.setDate(d.getDate() + n)
  return isoOf(d)
}

/** Whole days from a to b (positive when b is later). */
export function diffDays(a: string, b: string): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY)
}

export function fmtShort(iso: string): string {
  return toDate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function fmtLong(iso: string): string {
  return toDate(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function relative(iso: string, from = today()): string {
  const d = diffDays(from, iso)
  if (d === 0) return 'today'
  if (d === 1) return 'tomorrow'
  if (d === -1) return 'yesterday'
  return d > 0 ? `in ${d} days` : `${-d} days ago`
}

export function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
}
