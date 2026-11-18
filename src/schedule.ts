import type { AppData, MessageTemplate, Property, Reservation, SentMark } from './types'
import { addDays, diffDays, fmtLong, today } from './dates'

export type TaskState = 'sent' | 'overdue' | 'today' | 'upcoming'

export interface MessageTask {
  key: string
  reservation: Reservation
  property: Property
  template: MessageTemplate
  due: string
  sent?: SentMark
  state: TaskState
}

export function dueDate(r: Reservation, t: MessageTemplate): string {
  const base = t.anchor === 'booking' ? r.bookedOn : t.anchor === 'checkIn' ? r.checkIn : r.checkOut
  const due = addDays(base, t.offsetDays)
  // A stay booked at short notice: earlier messages become due on the booking day.
  return due < r.bookedOn ? r.bookedOn : due
}

export function stayStatus(r: Reservation, now = today()): 'upcoming' | 'in-house' | 'completed' {
  if (now < r.checkIn) return 'upcoming'
  if (now < r.checkOut) return 'in-house'
  return 'completed'
}

export function nights(r: Reservation): number {
  return diffDays(r.checkIn, r.checkOut)
}

export function extraGuests(r: Reservation, p: Property): number {
  return Math.max(0, r.guests - p.includedGuests)
}

export function buildTasks(data: AppData, propertyId: string | 'all', now = today()): MessageTask[] {
  const props = new Map(data.properties.map((p) => [p.id, p]))
  const tasks: MessageTask[] = []
  for (const r of data.reservations) {
    if (propertyId !== 'all' && r.propertyId !== propertyId) continue
    const property = props.get(r.propertyId)
    if (!property) continue
    for (const t of data.templates) {
      const due = dueDate(r, t)
      const sent = data.sent.find((s) => s.reservationId === r.id && s.templateId === t.id)
      const state: TaskState = sent ? 'sent' : due < now ? 'overdue' : due === now ? 'today' : 'upcoming'
      tasks.push({ key: `${r.id}:${t.id}`, reservation: r, property, template: t, due, sent, state })
    }
  }
  return tasks.sort((a, b) => a.due.localeCompare(b.due))
}

export const PLACEHOLDERS = [
  'guest_first_name',
  'property',
  'location',
  'check_in_date',
  'check_out_date',
  'check_in_time',
  'check_out_time',
  'nights',
  'guests',
  'host_name',
] as const

export function fillTemplate(body: string, r: Reservation, p: Property): string {
  const values: Record<string, string> = {
    guest_first_name: r.guestName.split(' ')[0] ?? r.guestName,
    property: p.name,
    location: p.location,
    check_in_date: fmtLong(r.checkIn),
    check_out_date: fmtLong(r.checkOut),
    check_in_time: p.checkInTime,
    check_out_time: p.checkOutTime,
    nights: String(nights(r)),
    guests: String(r.guests),
    host_name: p.hostName,
  }
  return body.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match)
}

export function money(value: number, currency: Property['currency']): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}
