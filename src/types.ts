export type ID = string

export interface Owner {
  id: ID
  name: string
  email: string
}

export interface Property {
  id: ID
  ownerId: ID
  name: string
  location: string
  currency: 'BRL' | 'EUR' | 'USD'
  checkInTime: string // "13:00"
  checkOutTime: string // "12:00"
  maxGuests: number
  /** Guests included in the nightly price; an extra fee applies above this. */
  includedGuests: number
  extraGuestFee: number // per extra guest, per night
  cleaningCost: number // paid to the cleaning team on checkout day
  hostName: string // person who welcomes guests on site
}

export interface Reservation {
  id: ID
  propertyId: ID
  guestName: string
  guests: number
  bookedOn: string // YYYY-MM-DD
  checkIn: string
  checkOut: string
  total: number
  notes: string
}

/** When a message is due, relative to a point in the reservation. */
export type Anchor = 'booking' | 'checkIn' | 'checkOut'

export interface MessageTemplate {
  id: ID
  name: string
  anchor: Anchor
  offsetDays: number
  body: string
}

export interface SentMark {
  reservationId: ID
  templateId: ID
  sentOn: string
}

export interface AppData {
  version: 1
  owners: Owner[]
  properties: Property[]
  reservations: Reservation[]
  templates: MessageTemplate[]
  sent: SentMark[]
}
