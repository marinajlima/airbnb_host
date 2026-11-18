import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import type { AppData, Owner, Property } from '../types'
import { money } from '../schedule'
import { today, uid } from '../dates'

interface Props {
  data: AppData
  setData: Dispatch<SetStateAction<AppData>>
}

const NEW_OWNER = '__new__'

export function PropertiesView({ data, setData }: Props) {
  const [editing, setEditing] = useState<Property | null>(null)
  const now = today()

  const blank = (): Property => ({
    id: '',
    ownerId: data.owners[0]?.id ?? NEW_OWNER,
    name: '',
    location: '',
    currency: 'EUR',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    maxGuests: 4,
    includedGuests: 2,
    extraGuestFee: 0,
    cleaningCost: 0,
    hostName: '',
  })

  const save = (p: Property, newOwner?: Owner) => {
    setData((d) => {
      const owners = newOwner ? [...d.owners, newOwner] : d.owners
      const prop = { ...p, ownerId: newOwner ? newOwner.id : p.ownerId }
      return p.id
        ? { ...d, owners, properties: d.properties.map((x) => (x.id === p.id ? prop : x)) }
        : { ...d, owners, properties: [...d.properties, { ...prop, id: uid() }] }
    })
    setEditing(null)
  }

  const remove = (p: Property) => {
    const count = data.reservations.filter((r) => r.propertyId === p.id).length
    if (!confirm(`Delete ${p.name}${count ? ` and its ${count} reservations` : ''}?`)) return
    setData((d) => {
      const ids = new Set(d.reservations.filter((r) => r.propertyId === p.id).map((r) => r.id))
      return {
        ...d,
        properties: d.properties.filter((x) => x.id !== p.id),
        reservations: d.reservations.filter((r) => !ids.has(r.id)),
        sent: d.sent.filter((s) => !ids.has(s.reservationId)),
        expenses: d.expenses.filter((e) => e.propertyId !== p.id),
        incidents: d.incidents.filter((i) => i.propertyId !== p.id),
        playbook: d.playbook.filter((e) => e.propertyId !== p.id),
      }
    })
  }

  return (
    <div className="view">
      <header className="view-head split">
        <div>
          <h1>Properties</h1>
          <p className="lede">House rules and costs used to fill in messages and flag extra guests.</p>
        </div>
        <button className="btn primary" onClick={() => setEditing(blank())}>Add property</button>
      </header>

      {editing && <PropertyForm data={data} initial={editing} onSave={save} onCancel={() => setEditing(null)} />}

      {data.owners.map((o) => {
        const owned = data.properties.filter((p) => p.ownerId === o.id)
        if (owned.length === 0) return null
        return (
          <section key={o.id}>
            <h2>
              {o.name} <span className="muted small">{o.email}</span>
            </h2>
            <ul className="property-list">
              {owned.map((p) => {
                const upcoming = data.reservations.filter((r) => r.propertyId === p.id && r.checkOut >= now).length
                return (
                  <li key={p.id} className="property">
                    <div className="property-title">
                      <h3>{p.name}</h3>
                      <span className="muted">{p.location}</span>
                    </div>
                    <dl className="facts">
                      <div><dt>Check-in</dt><dd>from {p.checkInTime}</dd></div>
                      <div><dt>Check-out</dt><dd>until {p.checkOutTime}</dd></div>
                      <div><dt>Guests</dt><dd>up to {p.maxGuests}</dd></div>
                      <div>
                        <dt>Extra guest fee</dt>
                        <dd>{p.extraGuestFee ? `${money(p.extraGuestFee, p.currency)} per night above ${p.includedGuests}` : 'None'}</dd>
                      </div>
                      <div><dt>Cleaning</dt><dd>{money(p.cleaningCost, p.currency)} per stay</dd></div>
                      <div><dt>Welcomes guests</dt><dd>{p.hostName || 'Not set'}</dd></div>
                    </dl>
                    <div className="property-foot">
                      <span className="muted">{upcoming} current or upcoming {upcoming === 1 ? 'stay' : 'stays'}</span>
                      <span>
                        <button className="link-button" onClick={() => setEditing(p)}>Edit</button>
                        <button className="link-button danger" onClick={() => remove(p)}>Delete</button>
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}

      {data.properties.length === 0 && <p className="empty">No properties yet. Add your first one to start taking reservations.</p>}
    </div>
  )
}

function PropertyForm({
  data,
  initial,
  onSave,
  onCancel,
}: {
  data: AppData
  initial: Property
  onSave: (p: Property, newOwner?: Owner) => void
  onCancel: () => void
}) {
  const [p, setP] = useState(initial)
  const [owner, setOwner] = useState({ name: '', email: '' })
  const set = <K extends keyof Property>(k: K, v: Property[K]) => setP((x) => ({ ...x, [k]: v }))
  const isNewOwner = p.ownerId === NEW_OWNER

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!p.name.trim()) return
    if (isNewOwner) {
      if (!owner.name.trim()) return
      onSave(p, { id: uid(), name: owner.name.trim(), email: owner.email.trim() })
    } else onSave(p)
  }

  return (
    <form className="panel form" onSubmit={submit}>
      <h2>{initial.id ? `Edit ${initial.name}` : 'New property'}</h2>
      <div className="grid">
        <label>
          Name
          <input required value={p.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        </label>
        <label>
          Location
          <input value={p.location} onChange={(e) => set('location', e.target.value)} />
        </label>
        <label>
          Owner
          <select value={p.ownerId} onChange={(e) => set('ownerId', e.target.value)}>
            {data.owners.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
            <option value={NEW_OWNER}>Add a new owner</option>
          </select>
        </label>
        {isNewOwner && (
          <>
            <label>
              Owner name
              <input required value={owner.name} onChange={(e) => setOwner({ ...owner, name: e.target.value })} />
            </label>
            <label>
              Owner email
              <input type="email" value={owner.email} onChange={(e) => setOwner({ ...owner, email: e.target.value })} />
            </label>
          </>
        )}
        <label>
          Currency
          <select value={p.currency} onChange={(e) => set('currency', e.target.value as Property['currency'])}>
            <option>EUR</option>
            <option>BRL</option>
            <option>USD</option>
          </select>
        </label>
        <label>
          Check-in from
          <input type="time" value={p.checkInTime} onChange={(e) => set('checkInTime', e.target.value)} />
        </label>
        <label>
          Check-out until
          <input type="time" value={p.checkOutTime} onChange={(e) => set('checkOutTime', e.target.value)} />
        </label>
        <label>
          Maximum guests
          <input type="number" min={1} value={p.maxGuests} onChange={(e) => set('maxGuests', Number(e.target.value))} />
        </label>
        <label>
          Guests included in price
          <input type="number" min={1} value={p.includedGuests} onChange={(e) => set('includedGuests', Number(e.target.value))} />
        </label>
        <label>
          Extra guest fee per night
          <input type="number" min={0} value={p.extraGuestFee} onChange={(e) => set('extraGuestFee', Number(e.target.value))} />
        </label>
        <label>
          Cleaning cost per stay
          <input type="number" min={0} value={p.cleaningCost} onChange={(e) => set('cleaningCost', Number(e.target.value))} />
        </label>
        <label>
          Person who welcomes guests
          <input value={p.hostName} onChange={(e) => set('hostName', e.target.value)} />
        </label>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn primary">{initial.id ? 'Save changes' : 'Add property'}</button>
        <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
