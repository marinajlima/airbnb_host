import type { AppData } from './types'
import { addDays, today } from './dates'

/**
 * Demo data only. Names, prices and places are fictional.
 * Dates are relative to today so the demo always has something happening.
 */
export function makeSeed(t = today()): AppData {
  const d = (n: number) => addDays(t, n)
  return {
    version: 1,
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
  }
}
