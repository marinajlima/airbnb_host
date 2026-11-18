import type { AppData, Expense, ExpenseCategory, Owner, Property, Reservation } from './types'
import { diffDays, today, uid } from './dates'
import { nights } from './schedule'

export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  cleaning: 'Cleaning',
  maintenance: 'Maintenance',
  supplies: 'Supplies',
  utilities: 'Bills',
  other: 'Other',
}

/** The cleaning cost a reservation creates, due on checkout day. */
export function cleaningFor(r: Reservation, p: Property, now = today()): Expense {
  return {
    id: uid(),
    propertyId: r.propertyId,
    date: r.checkOut,
    category: 'cleaning',
    amount: p.cleaningCost,
    description: `Cleaning after ${r.guestName}`,
    reservationId: r.id,
    paid: r.checkOut < now,
  }
}

/**
 * Keeps the linked cleaning cost in step with a reservation after it is added or edited.
 * An existing cost keeps its amount and paid status; only date, property and label follow the stay.
 */
export function syncCleaning(expenses: Expense[], r: Reservation, p: Property): Expense[] {
  const linked = expenses.find((e) => e.reservationId === r.id && e.category === 'cleaning')
  if (!linked) return p.cleaningCost > 0 ? [...expenses, { ...cleaningFor(r, p), paid: false }] : expenses
  return expenses.map((e) =>
    e.id === linked.id ? { ...e, date: r.checkOut, propertyId: r.propertyId, description: `Cleaning after ${r.guestName}` } : e,
  )
}

export function monthStart(ym: string): string {
  return `${ym}-01`
}

export function nextMonth(ym: string, step = 1): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + step, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function fmtMonth(ym: string): string {
  return new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

/** Nights of a stay that fall inside [start, end). */
export function nightsInRange(r: Reservation, start: string, end: string): number {
  const from = r.checkIn > start ? r.checkIn : start
  const to = r.checkOut < end ? r.checkOut : end
  return Math.max(0, diffDays(from, to))
}

export interface PropertyMonth {
  property: Property
  owner?: Owner
  nightsBooked: number
  nightsInMonth: number
  revenue: number
  costs: number
  result: number
}

/**
 * Revenue is split by nights: a stay from 29 Dec to 3 Jan counts 3 nights in December and 2 in January.
 * Costs count in the month of their date.
 */
export function monthByProperty(data: AppData, ym: string, propertyId: string | 'all'): PropertyMonth[] {
  const start = monthStart(ym)
  const end = monthStart(nextMonth(ym))
  const nightsInMonth = diffDays(start, end)
  const owners = new Map(data.owners.map((o) => [o.id, o]))

  return data.properties
    .filter((p) => propertyId === 'all' || p.id === propertyId)
    .map((p) => {
      let nightsBooked = 0
      let revenue = 0
      for (const r of data.reservations) {
        if (r.propertyId !== p.id) continue
        const n = nightsInRange(r, start, end)
        if (n === 0) continue
        nightsBooked += n
        revenue += (r.total * n) / Math.max(1, nights(r))
      }
      const costs = data.expenses
        .filter((e) => e.propertyId === p.id && e.date >= start && e.date < end)
        .reduce((sum, e) => sum + e.amount, 0)
      revenue = Math.round(revenue)
      return { property: p, owner: owners.get(p.ownerId), nightsBooked, nightsInMonth, revenue, costs, result: revenue - costs }
    })
}

/** Totals per currency, since BRL and EUR cannot be added together. */
export function totalsByCurrency(rows: PropertyMonth[]) {
  const map = new Map<Property['currency'], { revenue: number; costs: number; result: number }>()
  for (const r of rows) {
    const t = map.get(r.property.currency) ?? { revenue: 0, costs: 0, result: 0 }
    t.revenue += r.revenue
    t.costs += r.costs
    t.result += r.result
    map.set(r.property.currency, t)
  }
  return [...map.entries()].map(([currency, t]) => ({ currency, ...t }))
}
