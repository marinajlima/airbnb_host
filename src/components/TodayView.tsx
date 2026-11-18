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
}

export function TodayView({ data, tasks, propertyId, onOpenTask }: Props) {
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

      <section aria-labelledby="moves-h">
        <h2 id="moves-h">Arrivals and departures this week</h2>
        {movements.length === 0 ? (
          <p className="empty">No guests arriving or leaving in the next 7 days.</p>
        ) : (
          <ul className="rows">
            {movements.map((m) => {
              const p = props.get(m.r.propertyId)!
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
                        : `until ${p.checkOutTime}. Pay cleaning ${money(p.cleaningCost, p.currency)}`}
                    </span>
                    {m.r.notes && <span className="note">{m.r.notes}</span>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
