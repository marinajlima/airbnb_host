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

export type ExpenseCategory = 'cleaning' | 'maintenance' | 'supplies' | 'utilities' | 'other'

export interface Expense {
  id: ID
  propertyId: ID
  date: string // YYYY-MM-DD, when it is paid or due
  category: ExpenseCategory
  amount: number
  description: string
  /** Set for costs created from a reservation, such as cleaning on checkout day. */
  reservationId?: ID
  paid: boolean
}

export type IncidentCategory = 'checkinout' | 'request' | 'maintenance' | 'damage' | 'cleaning' | 'noise' | 'other'

export interface Incident {
  id: ID
  propertyId: ID
  reservationId?: ID
  date: string
  category: IncidentCategory
  /** Short name of the situation. Incidents with the same situation are counted together. */
  situation: string
  whatHappened: string
  howHandled: string
  status: 'open' | 'resolved'
}

export interface PlaybookEntry {
  id: ID
  situation: string
  category: IncidentCategory
  /** What to do next time. */
  rule: string
  /** 'all' or a single property. */
  propertyId: ID | 'all'
  updatedOn: string
}

/** Where a comparable listing sits against yours. */
export type MarketTier = 'mine' | 'higher' | 'lower'

export type MarketStatus = 'available' | 'unavailable' | 'min_nights'

/** One listing, for one date window, as seen in one market snapshot. */
export interface MarketObservation {
  propertyId: ID
  snapshotDate: string
  listingId: string
  listingName: string
  tier: MarketTier
  window: string
  checkIn: string
  checkOut: string
  guests: number
  status: MarketStatus
  nightly?: number
  discount: boolean
  /** Set by the analysis when the price comes from a longer stay than the window. */
  longerStay?: boolean
}

export interface AppData {
  version: 4
  owners: Owner[]
  properties: Property[]
  reservations: Reservation[]
  templates: MessageTemplate[]
  sent: SentMark[]
  expenses: Expense[]
  incidents: Incident[]
  playbook: PlaybookEntry[]
  market: MarketObservation[]
}
