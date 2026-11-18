import type { AppData } from '../types'
import type { MessageTask } from '../schedule'
import { addDays, diffDays, fmtShort, toDate, today } from '../dates'

interface Props {
  data: AppData
  tasks: MessageTask[]
  propertyId: string
  onOpenTask: (t: MessageTask) => void
}

const BEFORE = 3
const SPAN = 35

const STATE_LABEL = { sent: 'sent', overdue: 'late', today: 'due today', upcoming: 'scheduled' }

export function TideChart({ data, tasks, propertyId, onOpenTask }: Props) {
  const now = today()
  const start = addDays(now, -BEFORE)
  const end = addDays(start, SPAN)
  const pos = (iso: string) => (diffDays(start, iso) / SPAN) * 100
  const clamp = (v: number) => Math.min(100, Math.max(0, v))

  const props = new Map(data.properties.map((p) => [p.id, p]))
  const stays = data.reservations
    .filter((r) => propertyId === 'all' || r.propertyId === propertyId)
    .filter((r) => r.checkOut >= start && r.bookedOn <= end && (r.checkIn <= end || tasks.some((t) => t.reservation.id === r.id && t.due <= end)))
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))

  const days = Array.from({ length: SPAN }, (_, i) => addDays(start, i))

  if (stays.length === 0) {
    return <p className="empty">No stays in this period. Add a reservation to see it here.</p>
  }

  return (
    <div className="tide-scroll">
      <div className="tide" role="table" aria-label="Stays and guest messages over the next five weeks">
        <div className="tide-row tide-scale" role="row">
          <div className="tide-label" role="columnheader" />
          <div className="tide-track" role="columnheader">
            {days.map((d) => {
              const dt = toDate(d)
              const isMonday = dt.getDay() === 1
              return (
                <span key={d} className={`tick${isMonday ? ' major' : ''}`} style={{ left: `${pos(d)}%` }}>
                  {isMonday && <em>{fmtShort(d)}</em>}
                </span>
              )
            })}
            <span className="now-flag" style={{ left: `${pos(now) + 100 / SPAN / 2}%` }}>Today</span>
          </div>
        </div>

        {stays.map((r) => {
          const p = props.get(r.propertyId)!
          const bandStart = clamp(pos(r.checkIn) + 100 / SPAN / 2)
          const bandEnd = clamp(pos(r.checkOut) + 100 / SPAN / 2)
          const rowTasks = tasks.filter((t) => t.reservation.id === r.id && t.due >= start && t.due < end)
          return (
            <div className="tide-row" role="row" key={r.id}>
              <div className="tide-label" role="cell">
                <strong>{r.guestName}</strong>
                <span className="muted">
                  {p.name}, {fmtShort(r.checkIn)} to {fmtShort(r.checkOut)}
                </span>
              </div>
              <div className="tide-track" role="cell">
                <span className="now-line" style={{ left: `${pos(now) + 100 / SPAN / 2}%` }} />
                {bandEnd > bandStart && <span className="stay-band" style={{ left: `${bandStart}%`, width: `${bandEnd - bandStart}%` }} />}
                {rowTasks.map((t) => (
                  <button
                    key={t.key}
                    className={`dot ${t.state}`}
                    style={{ left: `${pos(t.due) + 100 / SPAN / 2}%` }}
                    onClick={() => onOpenTask(t)}
                    aria-label={`${t.template.name} for ${r.guestName}, ${fmtShort(t.due)}, ${STATE_LABEL[t.state]}`}
                    title={`${t.template.name}, ${fmtShort(t.due)} (${STATE_LABEL[t.state]})`}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <ul className="legend" aria-label="Legend">
        <li><span className="dot static sent" /> Sent</li>
        <li><span className="dot static today" /> Due today</li>
        <li><span className="dot static overdue" /> Late</li>
        <li><span className="dot static upcoming" /> Scheduled</li>
        <li><span className="band-key" /> Guests in the house</li>
      </ul>
    </div>
  )
}
