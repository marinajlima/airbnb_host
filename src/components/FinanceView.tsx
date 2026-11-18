import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import type { AppData, Expense, ExpenseCategory } from '../types'
import { CATEGORY_LABEL, fmtMonth, monthByProperty, monthStart, nextMonth, totalsByCurrency } from '../finance'
import { money } from '../schedule'
import { fmtShort, today, uid } from '../dates'

interface Props {
  data: AppData
  setData: Dispatch<SetStateAction<AppData>>
  propertyId: string
}

export function FinanceView({ data, setData, propertyId }: Props) {
  const now = today()
  const [ym, setYm] = useState(now.slice(0, 7))
  const [adding, setAdding] = useState(false)

  const rows = monthByProperty(data, ym, propertyId)
  const totals = totalsByCurrency(rows)
  const start = monthStart(ym)
  const end = monthStart(nextMonth(ym))
  const props = new Map(data.properties.map((p) => [p.id, p]))

  const costs = data.expenses
    .filter((e) => (propertyId === 'all' || e.propertyId === propertyId) && e.date >= start && e.date < end)
    .sort((a, b) => a.date.localeCompare(b.date))
  const unpaidEarlier = data.expenses.filter(
    (e) => (propertyId === 'all' || e.propertyId === propertyId) && !e.paid && e.date < start && e.date < now,
  )

  const togglePaid = (id: string) =>
    setData((d) => ({ ...d, expenses: d.expenses.map((e) => (e.id === id ? { ...e, paid: !e.paid } : e)) }))

  const remove = (e: Expense) => {
    if (!confirm(`Delete "${e.description}"?`)) return
    setData((d) => ({ ...d, expenses: d.expenses.filter((x) => x.id !== e.id) }))
  }

  const add = (e: Expense) => {
    setData((d) => ({ ...d, expenses: [...d.expenses, e] }))
    setAdding(false)
    setYm(e.date.slice(0, 7))
  }

  return (
    <div className="view">
      <header className="view-head split">
        <div>
          <h1>Finance</h1>
          <p className="lede">Payouts minus costs, per property. A stay that crosses two months is split by its nights.</p>
        </div>
        <button className="btn primary" onClick={() => setAdding(true)} disabled={data.properties.length === 0}>
          Add cost
        </button>
      </header>

      {adding && <ExpenseForm data={data} propertyId={propertyId} defaultDate={ym === now.slice(0, 7) ? now : start} onSave={add} onCancel={() => setAdding(false)} />}

      <div className="month-nav">
        <button className="btn ghost" onClick={() => setYm(nextMonth(ym, -1))} aria-label="Previous month">‹</button>
        <h2>{fmtMonth(ym)}</h2>
        <button className="btn ghost" onClick={() => setYm(nextMonth(ym, 1))} aria-label="Next month">›</button>
        {ym !== now.slice(0, 7) && (
          <button className="link-button" onClick={() => setYm(now.slice(0, 7))}>This month</button>
        )}
      </div>

      <section aria-label="Month result">
        <div className="ledger">
          {totals.map((t) => (
            <dl key={t.currency} className="ledger-line">
              <div><dt>Payouts</dt><dd>{money(t.revenue, t.currency)}</dd></div>
              <div><dt>Costs</dt><dd>{money(t.costs, t.currency)}</dd></div>
              <div className="ledger-result"><dt>Result</dt><dd className={t.result < 0 ? 'negative' : ''}>{money(t.result, t.currency)}</dd></div>
            </dl>
          ))}
        </div>
        {totals.length > 1 && <p className="hint">Totals are kept per currency.</p>}
      </section>

      <section>
        <h2>By property</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Property</th>
                <th scope="col" className="num">Nights booked</th>
                <th scope="col" className="num">Occupancy</th>
                <th scope="col" className="num">Payouts</th>
                <th scope="col" className="num">Costs</th>
                <th scope="col" className="num">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.property.id}>
                  <td>
                    <strong>{r.property.name}</strong>
                    <span className="muted block">{r.owner?.name ?? 'No owner'}</span>
                  </td>
                  <td className="num">{r.nightsBooked} of {r.nightsInMonth}</td>
                  <td className="num">
                    <span className="occ">
                      <span className="occ-bar" aria-hidden="true"><span style={{ width: `${(r.nightsBooked / r.nightsInMonth) * 100}%` }} /></span>
                      {Math.round((r.nightsBooked / r.nightsInMonth) * 100)}%
                    </span>
                  </td>
                  <td className="num">{money(r.revenue, r.property.currency)}</td>
                  <td className="num">{money(r.costs, r.property.currency)}</td>
                  <td className={r.result < 0 ? 'num negative' : 'num'}><strong>{money(r.result, r.property.currency)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Costs in {fmtMonth(ym).split(' ')[0]}</h2>
        {unpaidEarlier.length > 0 && (
          <p className="callout">
            {unpaidEarlier.length} {unpaidEarlier.length === 1 ? 'cost' : 'costs'} from earlier months still unpaid.
          </p>
        )}
        {costs.length === 0 ? (
          <p className="empty">No costs this month.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Cost</th>
                  <th scope="col">Property</th>
                  <th scope="col" className="num">Amount</th>
                  <th scope="col">Paid</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {costs.map((e) => {
                  const p = props.get(e.propertyId)
                  return (
                    <tr key={e.id}>
                      <td>{fmtShort(e.date)}</td>
                      <td>
                        {e.description}
                        <span className="muted block">{CATEGORY_LABEL[e.category]}{e.reservationId ? ', from a reservation' : ''}</span>
                      </td>
                      <td>{p?.name}</td>
                      <td className="num">{p ? money(e.amount, p.currency) : e.amount}</td>
                      <td>
                        <label className="check">
                          <input type="checkbox" checked={e.paid} onChange={() => togglePaid(e.id)} />
                          {e.paid ? 'Paid' : e.date < now ? 'Late' : 'To pay'}
                        </label>
                      </td>
                      <td className="actions">
                        <button className="link-button danger" onClick={() => remove(e)}>Delete</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function ExpenseForm({
  data,
  propertyId,
  defaultDate,
  onSave,
  onCancel,
}: {
  data: AppData
  propertyId: string
  defaultDate: string
  onSave: (e: Expense) => void
  onCancel: () => void
}) {
  const [e, setE] = useState<Expense>({
    id: uid(),
    propertyId: propertyId !== 'all' ? propertyId : data.properties[0]?.id ?? '',
    date: defaultDate,
    category: 'maintenance',
    amount: 0,
    description: '',
    paid: false,
  })
  const set = <K extends keyof Expense>(k: K, v: Expense[K]) => setE((x) => ({ ...x, [k]: v }))
  const currency = data.properties.find((p) => p.id === e.propertyId)?.currency

  const submit = (ev: FormEvent) => {
    ev.preventDefault()
    if (e.description.trim() && e.amount > 0) onSave({ ...e, description: e.description.trim() })
  }

  return (
    <form className="panel form" onSubmit={submit}>
      <h2>New cost</h2>
      <div className="grid">
        <label className="wide">
          What was it
          <input required value={e.description} onChange={(ev) => set('description', ev.target.value)} placeholder="Pool pump repair" autoFocus />
        </label>
        <label>
          Property
          <select value={e.propertyId} onChange={(ev) => set('propertyId', ev.target.value)}>
            {data.properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select value={e.category} onChange={(ev) => set('category', ev.target.value as ExpenseCategory)}>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Amount {currency && `(${currency})`}
          <input type="number" min={0} required value={e.amount} onChange={(ev) => set('amount', Number(ev.target.value))} />
        </label>
        <label>
          Date
          <input type="date" required value={e.date} onChange={(ev) => set('date', ev.target.value)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={e.paid} onChange={(ev) => set('paid', ev.target.checked)} />
          Already paid
        </label>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn primary">Add cost</button>
        <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
