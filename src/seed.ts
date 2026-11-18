import type { AppData } from './types'
import { addDays, today } from './dates'
import { cleaningFor } from './finance'

/**
 * Demo data only. Names, prices and places are fictional.
 * Dates are relative to today so the demo always has something happening.
 */
export function makeSeed(t = today()): AppData {
  const d = (n: number) => addDays(t, n)
  const data: AppData = {
    version: 3,
    owners: [
      { id: 'o1', name: 'Ana Duarte', email: 'ana@example.com' },
      { id: 'o2', name: 'Rafael Costa', email: 'rafael@example.com' },
    ],
    properties: [
      {
        id: 'p1',
        ownerId: 'o1',
        name: 'Casa Maré',
        location: 'Barra de São Miguel, Brazil',
        currency: 'BRL',
        checkInTime: '13:00',
        checkOutTime: '12:00',
        maxGuests: 12,
        includedGuests: 6,
        extraGuestFee: 150,
        cleaningCost: 200,
        hostName: 'Dona Lúcia',
      },
      {
        id: 'p2',
        ownerId: 'o2',
        name: 'Alfama Loft',
        location: 'Lisbon, Portugal',
        currency: 'EUR',
        checkInTime: '15:00',
        checkOutTime: '11:00',
        maxGuests: 4,
        includedGuests: 2,
        extraGuestFee: 20,
        cleaningCost: 45,
        hostName: 'João',
      },
    ],
    reservations: [
      { id: 'r1', propertyId: 'p1', guestName: 'Beatriz Almeida', guests: 8, bookedOn: d(-40), checkIn: d(-9), checkOut: d(-5), total: 6200, notes: 'Asked for a late checkout.' },
      { id: 'r2', propertyId: 'p2', guestName: 'Tom Becker', guests: 2, bookedOn: d(-20), checkIn: d(-2), checkOut: d(2), total: 520, notes: '' },
      { id: 'r3', propertyId: 'p1', guestName: 'Carla Menezes', guests: 6, bookedOn: d(-25), checkIn: d(1), checkOut: d(5), total: 5000, notes: 'Travelling with a baby, needs a cot.' },
      { id: 'r4', propertyId: 'p2', guestName: 'Sofia Lindqvist', guests: 3, bookedOn: d(-12), checkIn: d(7), checkOut: d(11), total: 610, notes: '' },
      { id: 'r5', propertyId: 'p1', guestName: 'Pedro Henrique Lima', guests: 10, bookedOn: d(-3), checkIn: d(12), checkOut: d(16), total: 8400, notes: 'Family reunion.' },
      { id: 'r6', propertyId: 'p2', guestName: 'Aiko Tanaka', guests: 2, bookedOn: d(0), checkIn: d(20), checkOut: d(24), total: 540, notes: '' },
      { id: 'r7', propertyId: 'p1', guestName: 'Lucas Ferreira', guests: 4, bookedOn: d(-1), checkIn: d(26), checkOut: d(29), total: 3750, notes: '' },
    ],
    templates: [
      {
        id: 't1',
        name: 'Booking accepted',
        anchor: 'booking',
        offsetDays: 0,
        body:
          'Dear {guest_first_name},\n\nThank you for choosing {property}. We are delighted to welcome you on {check_in_date}.\n\nCheck-in is from {check_in_time} and check-out is until {check_out_time}. A week before your arrival we will send everything you need: directions, access and our local recommendations.\n\nWarm regards',
      },
      {
        id: 't2',
        name: 'Arrival guide',
        anchor: 'checkIn',
        offsetDays: -7,
        body:
          'Dear {guest_first_name},\n\nYour stay at {property} is one week away. Here is what you need for a smooth arrival:\n\nAddress and map: [link]\nCheck-in: from {check_in_time} on {check_in_date}\nCheck-out: until {check_out_time} on {check_out_date}\n\n{host_name} will welcome you, hand over the keys and show you around. On request, {host_name} can also arrange meals, groceries or extra cleaning during your stay.\n\nLocal recommendations: [list]\n\nWarm regards',
      },
      {
        id: 't3',
        name: 'See you tomorrow',
        anchor: 'checkIn',
        offsetDays: -1,
        body:
          'Dear {guest_first_name},\n\nWe look forward to welcoming you tomorrow. Please share your expected arrival time so {host_name} can be there to receive you.\n\nSafe travels',
      },
      {
        id: 't4',
        name: 'Checkout morning',
        anchor: 'checkOut',
        offsetDays: 0,
        body:
          'Dear {guest_first_name},\n\nWe hope you enjoyed your {nights} nights at {property}. A gentle reminder that check-out is until {check_out_time}. Please leave the keys with {host_name}.\n\nThank you for staying with us',
      },
      {
        id: 't5',
        name: 'Review request',
        anchor: 'checkOut',
        offsetDays: 1,
        body:
          'Dear {guest_first_name},\n\nThank you again for staying at {property}. If you have a moment, a review would mean a great deal to us and helps future guests find the house.\n\nWe would love to host you again',
      },
    ],
    sent: [
      { reservationId: 'r1', templateId: 't1', sentOn: d(-40) },
      { reservationId: 'r1', templateId: 't2', sentOn: d(-16) },
      { reservationId: 'r1', templateId: 't3', sentOn: d(-10) },
      { reservationId: 'r1', templateId: 't4', sentOn: d(-5) },
      { reservationId: 'r2', templateId: 't1', sentOn: d(-20) },
      { reservationId: 'r2', templateId: 't2', sentOn: d(-9) },
      { reservationId: 'r2', templateId: 't3', sentOn: d(-3) },
      { reservationId: 'r3', templateId: 't1', sentOn: d(-25) },
      { reservationId: 'r3', templateId: 't2', sentOn: d(-6) },
      { reservationId: 'r4', templateId: 't1', sentOn: d(-12) },
      { reservationId: 'r5', templateId: 't1', sentOn: d(-3) },
    ],
    expenses: [],
    incidents: [
      { id: 'i1', propertyId: 'p1', date: d(-62), category: 'checkinout', situation: 'Late checkout', whatHappened: 'Guests stayed until 13:30 without asking.', howHandled: 'Spoke to them kindly; the cleaning team waited and the next arrival was not affected.', status: 'resolved' },
      { id: 'i2', propertyId: 'p1', reservationId: 'r1', date: d(-5), category: 'checkinout', situation: 'Late checkout', whatHappened: 'Asked to leave at 15:00 instead of 12:00.', howHandled: 'Allowed until 14:00, since no one was arriving that day.', status: 'resolved' },
      { id: 'i3', propertyId: 'p1', reservationId: 'r3', date: d(-2), category: 'request', situation: 'Baby cot request', whatHappened: 'Travelling with a baby and asked for a cot.', howHandled: 'Borrowed a cot from a neighbour. Return it after checkout.', status: 'open' },
      { id: 'i4', propertyId: 'p2', date: d(-30), category: 'maintenance', situation: 'No hot water', whatHappened: 'No hot water in the morning.', howHandled: 'Plumber visit, the boiler valve was replaced.', status: 'resolved' },
      { id: 'i5', propertyId: 'p2', reservationId: 'r2', date: d(-1), category: 'maintenance', situation: 'No hot water', whatHappened: 'Boiler pressure dropped on the second night.', howHandled: 'João reset the boiler pressure on site.', status: 'resolved' },
    ],
    playbook: [
      {
        id: 'pb1',
        situation: 'Late checkout',
        category: 'checkinout',
        propertyId: 'all',
        rule: 'Checkout time is stated in the booking accepted message. If no one arrives that day, allow up to two extra hours at no cost. If someone arrives, decline politely and offer to keep the luggage until they leave.',
        updatedOn: d(-5),
      },
    ],
  }

  const props = new Map(data.properties.map((p) => [p.id, p]))
  data.expenses = [
    ...data.reservations.map((r, i) => ({ ...cleaningFor(r, props.get(r.propertyId)!, t), id: `e${i + 1}` })),
    { id: 'x1', propertyId: 'p1', date: d(-12), category: 'maintenance', amount: 480, description: 'Pool pump repair', paid: true },
    { id: 'x2', propertyId: 'p1', date: d(-6), category: 'supplies', amount: 260, description: 'Towels and bed linen', paid: true },
    { id: 'x3', propertyId: 'p2', date: d(-4), category: 'utilities', amount: 68, description: 'Electricity and internet', paid: true },
    { id: 'x4', propertyId: 'p1', date: d(10), category: 'utilities', amount: 390, description: 'Electricity bill', paid: false },
  ]
  return data
}
