import type { AppData } from '../types'
import type { MessageTask } from '../schedule'
import { money } from '../schedule'
import { addDays, fmtLong, fmtShort, relative, today } from '../dates'
import { TideChart } from './TideChart'

interface Props {
  data: AppData
  tasks: MessageTask[]
  propertyId: string
  onOpenTask: (t: MessageTask) => void
  onTogglePaid: (expenseId: string) => void
  onResolve: (incidentId: string) => void
  onOpenPlaybook: () => void
}

export function TodayView({ data, tasks, propertyId, onOpenTask, onTogglePaid, onResolve, onOpenPlaybook }: Props) {
  const now = today()
  const toSend = tasks.filter((t) => t.state === 'overdue' || t.state === 'today')
  const next = tasks.find((t) => t.state === 'upcoming')
  const weekEnd = addDays(now, 7)

  const props = new Map(data.properties.map((p) => [p.id, p]))
  const scoped = data.reservations.filter((r) => propertyId === 'all' || r.propertyId === propertyId)
  const movements = [
    ...scoped.filter((r) => r.checkIn >= now && r.checkIn <= weekEnd).map((r) => ({ kind: 'Arrival' as const, date: r.checkIn, r })),
    ...scoped.filter((r) => r.checkOut >= now && r.checkOut <= weekEnd).map((r) => ({ kind: 'Departure' as const, date: r.checkOut, r })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  const openIncidents = data.incidents
    .filter((i) => i.status === 'open' && (propertyId === 'all' || i.propertyId === propertyId))
    .sort((a, b) => a.date.localeCompare(b.date))
  const stays = new Map(data.reservations.map((r) => [r.id, r]))

  const arrivals = movements.filter((m) => m.kind === 'Arrival').length
  const departures = movements.length - arrivals

  return (
    <div className="view">
      <header className="view-head">
        <h1>Today</h1>
        <p className="lede">
          {fmtLong(now)}. {toSend.length === 0 ? 'No messages to send' : `${toSend.length} ${toSend.length === 1 ? 'message' : 'messages'} to send`},{' '}
          {arrivals} {arrivals === 1 ? 'arrival' : 'arrivals'} and {departures} {departures === 1 ? 'departure' : 'departures'} in the next 7 days.
        </p>
      </header>

      <section aria-labelledby="send-h">
        <h2 id="send-h">To send</h2>
        {toSend.length === 0 ? (
          <p className="empty">
            You are up to date.{next && ` Next: ${next.template.name} for ${next.reservation.guestName}, ${relative(next.due)}.`}
          </p>
        ) : (
          <ul className="rows">
            {toSend.map((t) => (
              <li key={t.key} className="row">
                <span className={`pill ${t.state}`}>{t.state === 'overdue' ? `Late, due ${fmtShort(t.due)}` : 'Due today'}</span>
                <div className="row-main">
                  <strong>{t.template.name}</strong>
                  <span className="muted">
                    {t.reservation.guestName}, {t.property.name}, arriving {fmtShort(t.reservation.checkIn)}
                  </span>
                </div>
                <button className="btn" onClick={() => onOpenTask(t)}>Open message</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="tide-h">
        <h2 id="tide-h">Next five weeks</h2>
        <p className="hint">Each line is a stay. Dots are guest messages: click one to read and send it.</p>
        <TideChart data={data} tasks={tasks} propertyId={propertyId} onOpenTask={onOpenTask} />
      </section>

      {openIncidents.length > 0 && (
        <section aria-labelledby="open-h">
          <h2 id="open-h">Open incidents</h2>
          <ul className="rows">
            {openIncidents.map((i) => {
              const stay = i.reservationId ? stays.get(i.reservationId) : undefined
              return (
                <li key={i.id} className="row">
                  <span className="date-chip">
                    <b>{fmtShort(i.date)}</b>
                    <small>{relative(i.date)}</small>
                  </span>
                  <div className="row-main">
                    <strong>{i.situation}</strong>
                    <span className="muted">
                      {props.get(i.propertyId)?.name}
                      {stay ? `, ${stay.guestName}` : ''}. {i.howHandled}
                    </span>
                  </div>
                  <button className="btn" onClick={() => onResolve(i.id)}>Mark resolved</button>
                </li>
              )
            })}
          </ul>
          <button className="link-button" onClick={onOpenPlaybook}>Open the playbook</button>
        </section>
      )}

      <section aria-labelledby="moves-h">
        <h2 id="moves-h">Arrivals and departures this week</h2>
        {movements.length === 0 ? (
          <p className="empty">No guests arriving or leaving in the next 7 days.</p>
        ) : (
          <ul className="rows">
            {movements.map((m) => {
              const p = props.get(m.r.propertyId)!
              const cleaning =
                m.kind === 'Departure' ? data.expenses.find((e) => e.reservationId === m.r.id && e.category === 'cleaning') : undefined
              return (
                <li key={`${m.kind}-${m.r.id}`} className="row">
                  <span className="date-chip">
                    <b>{fmtShort(m.date)}</b>
                    <small>{relative(m.date)}</small>
                  </span>
                  <div className="row-main">
                    <strong>
                      {m.kind}: {m.r.guestName}
                    </strong>
                    <span className="muted">
                      {p.name}, {m.r.guests} guests,{' '}
                      {m.kind === 'Arrival'
                        ? `from ${p.checkInTime} with ${p.hostName}`
                        : `until ${p.checkOutTime}`}
                      {cleaning && `. Cleaning ${money(cleaning.amount, p.currency)} ${cleaning.paid ? 'paid' : 'to pay'}`}
                    </span>
                    {m.r.notes && <span className="note">{m.r.notes}</span>}
                  </div>
                  {cleaning && (
                    <button className={cleaning.paid ? 'btn ghost' : 'btn'} onClick={() => onTogglePaid(cleaning.id)}>
                      {cleaning.paid ? 'Mark as not paid' : 'Mark as paid'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
