import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import type { AppData, Reservation } from '../types'
import { extraGuests, money, nights, stayStatus } from '../schedule'
import { addDays, fmtShort, today, uid } from '../dates'
import { syncCleaning } from '../finance'

interface Props {
  data: AppData
  setData: Dispatch<SetStateAction<AppData>>
  propertyId: string
}

const STATUS_LABEL = { upcoming: 'Upcoming', 'in-house': 'In the house', completed: 'Completed' }

export function ReservationsView({ data, setData, propertyId }: Props) {
  const [editing, setEditing] = useState<Reservation | null>(null)
  const props = new Map(data.properties.map((p) => [p.id, p]))
  const now = today()

  const list = data.reservations
    .filter((r) => propertyId === 'all' || r.propertyId === propertyId)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
  const current = list.filter((r) => r.checkOut >= now)
  const past = list.filter((r) => r.checkOut < now).reverse()

  const blank = (): Reservation => ({
    id: '',
    propertyId: propertyId !== 'all' ? propertyId : data.properties[0]?.id ?? '',
    guestName: '',
    guests: 2,
    bookedOn: now,
    checkIn: addDays(now, 14),
    checkOut: addDays(now, 17),
    total: 0,
    notes: '',
  })

  const save = (input: Reservation) => {
    setData((d) => {
      const r = input.id ? input : { ...input, id: uid() }
      const reservations = input.id ? d.reservations.map((x) => (x.id === r.id ? r : x)) : [...d.reservations, r]
      const p = d.properties.find((x) => x.id === r.propertyId)
      return { ...d, reservations, expenses: p ? syncCleaning(d.expenses, r, p) : d.expenses }
    })
    setEditing(null)
  }

  const remove = (r: Reservation) => {
    if (!confirm(`Delete the reservation for ${r.guestName}?`)) return
    setData((d) => ({
      ...d,
      reservations: d.reservations.filter((x) => x.id !== r.id),
      sent: d.sent.filter((s) => s.reservationId !== r.id),
      expenses: d.expenses.filter((e) => e.reservationId !== r.id),
      // incidents stay in the log; they just lose the link to the deleted stay
      incidents: d.incidents.map((i) => (i.reservationId === r.id ? { ...i, reservationId: undefined } : i)),
    }))
  }

  const table = (rows: Reservation[]) => (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Guest</th>
            <th scope="col">Property</th>
            <th scope="col">Stay</th>
            <th scope="col" className="num">Guests</th>
            <th scope="col" className="num">Payout</th>
            <th scope="col">Status</th>
            <th scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const p = props.get(r.propertyId)
            const extra = p ? extraGuests(r, p) : 0
            const status = stayStatus(r, now)
            return (
              <tr key={r.id}>
                <td>
                  <strong>{r.guestName}</strong>
                  {r.notes && <span className="note">{r.notes}</span>}
                </td>
                <td>{p?.name ?? 'Unknown'}</td>
                <td>
                  {fmtShort(r.checkIn)} to {fmtShort(r.checkOut)}
                  <span className="muted block">{nights(r)} nights</span>
                </td>
                <td className="num">
                  {r.guests}
                  {extra > 0 && <span className="muted block">{extra} extra</span>}
                </td>
                <td className="num">{p ? money(r.total, p.currency) : r.total}</td>
                <td><span className={`status ${status}`}>{STATUS_LABEL[status]}</span></td>
                <td className="actions">
                  <button className="link-button" onClick={() => setEditing(r)}>Edit</button>
                  <button className="link-button danger" onClick={() => remove(r)}>Delete</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="view">
      <header className="view-head split">
        <div>
          <h1>Reservations</h1>
          <p className="lede">Add each booking once. Guest messages are scheduled from its dates.</p>
        </div>
        <button className="btn primary" onClick={() => setEditing(blank())} disabled={data.properties.length === 0}>
          Add reservation
        </button>
      </header>

      {editing && <ReservationForm data={data} initial={editing} onSave={save} onCancel={() => setEditing(null)} />}

      <section>
        <h2>Current and upcoming</h2>
        {current.length ? table(current) : <p className="empty">No upcoming stays. Add a reservation to start scheduling messages.</p>}
      </section>
      {past.length > 0 && (
        <section>
          <h2>Past stays</h2>
          {table(past)}
        </section>
      )}
    </div>
  )
}

function ReservationForm({
  data,
  initial,
  onSave,
  onCancel,
}: {
  data: AppData
  initial: Reservation
  onSave: (r: Reservation) => void
  onCancel: () => void
}) {
  const [r, setR] = useState(initial)
  const set = <K extends keyof Reservation>(k: K, v: Reservation[K]) => setR((x) => ({ ...x, [k]: v }))
  const property = data.properties.find((p) => p.id === r.propertyId)

  let error = ''
  if (r.checkOut <= r.checkIn) error = 'Check-out must be after check-in.'
  else if (property && r.guests > property.maxGuests) error = `${property.name} takes up to ${property.maxGuests} guests.`
  else if (r.bookedOn > r.checkIn) error = 'The booking date cannot be after check-in.'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!error && r.guestName.trim()) onSave({ ...r, guestName: r.guestName.trim() })
  }

  return (
    <form className="panel form" onSubmit={submit}>
      <h2>{initial.id ? 'Edit reservation' : 'New reservation'}</h2>
      <div className="grid">
        <label>
          Guest name
          <input required value={r.guestName} onChange={(e) => set('guestName', e.target.value)} autoFocus />
        </label>
        <label>
          Property
          <select value={r.propertyId} onChange={(e) => set('propertyId', e.target.value)}>
            {data.properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label>
          Check-in
          <input type="date" required value={r.checkIn} onChange={(e) => set('checkIn', e.target.value)} />
        </label>
        <label>
          Check-out
          <input type="date" required value={r.checkOut} onChange={(e) => set('checkOut', e.target.value)} />
        </label>
        <label>
          Guests
          <input type="number" min={1} value={r.guests} onChange={(e) => set('guests', Number(e.target.value))} />
        </label>
        <label>
          Host payout {property && `(${property.currency})`}
          <input type="number" min={0} value={r.total} onChange={(e) => set('total', Number(e.target.value))} />
        </label>
        <label>
          Booked on
          <input type="date" required value={r.bookedOn} onChange={(e) => set('bookedOn', e.target.value)} />
        </label>
        <label className="wide">
          Notes
          <input value={r.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Special requests, arrival time" />
        </label>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="btn primary" disabled={!!error}>
          {initial.id ? 'Save changes' : 'Add reservation'}
        </button>
        <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
