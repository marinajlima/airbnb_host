import { useState, type Dispatch, type SetStateAction } from 'react'
import type { Anchor, AppData, MessageTemplate } from '../types'
import { PLACEHOLDERS } from '../schedule'
import { uid } from '../dates'

interface Props {
  data: AppData
  setData: Dispatch<SetStateAction<AppData>>
}

const ANCHOR_LABEL: Record<Anchor, string> = {
  booking: 'the booking date',
  checkIn: 'check-in',
  checkOut: 'check-out',
}

export function describeTiming(t: Pick<MessageTemplate, 'anchor' | 'offsetDays'>): string {
  const n = Math.abs(t.offsetDays)
  if (n === 0) return t.anchor === 'booking' ? 'When the booking is made' : `On the day of ${ANCHOR_LABEL[t.anchor]}`
  return `${n} ${n === 1 ? 'day' : 'days'} ${t.offsetDays < 0 ? 'before' : 'after'} ${ANCHOR_LABEL[t.anchor]}`
}

export function TemplatesView({ data, setData }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(data.templates[0]?.id ?? null)
  const selected = data.templates.find((t) => t.id === selectedId) ?? null

  const order = (t: MessageTemplate) => (t.anchor === 'booking' ? -1000 : t.anchor === 'checkIn' ? 0 : 1000) + t.offsetDays
  const sorted = [...data.templates].sort((a, b) => order(a) - order(b))

  const update = (patch: Partial<MessageTemplate>) => {
    if (!selected) return
    setData((d) => ({ ...d, templates: d.templates.map((t) => (t.id === selected.id ? { ...t, ...patch } : t)) }))
  }

  const add = () => {
    const t: MessageTemplate = { id: uid(), name: 'New message', anchor: 'checkIn', offsetDays: -3, body: 'Dear {guest_first_name},\n\n' }
    setData((d) => ({ ...d, templates: [...d.templates, t] }))
    setSelectedId(t.id)
  }

  const remove = () => {
    if (!selected || !confirm(`Delete the template "${selected.name}"?`)) return
    setData((d) => ({
      ...d,
      templates: d.templates.filter((t) => t.id !== selected.id),
      sent: d.sent.filter((s) => s.templateId !== selected.id),
    }))
    setSelectedId(null)
  }

  return (
    <div className="view">
      <header className="view-head split">
        <div>
          <h1>Message templates</h1>
          <p className="lede">Write each message once. StayOps schedules it for every reservation and fills in the details.</p>
        </div>
        <button className="btn primary" onClick={add}>Add template</button>
      </header>

      <div className="templates">
        <ol className="template-list" aria-label="Templates in the order guests receive them">
          {sorted.map((t) => (
            <li key={t.id}>
              <button className={t.id === selectedId ? 'template-item active' : 'template-item'} onClick={() => setSelectedId(t.id)}>
                <strong>{t.name}</strong>
                <span className="muted">{describeTiming(t)}</span>
              </button>
            </li>
          ))}
        </ol>

        {selected ? (
          <div className="panel editor">
            <div className="grid">
              <label className="wide">
                Name
                <input value={selected.name} onChange={(e) => update({ name: e.target.value })} />
              </label>
              <label>
                Days
                <input
                  type="number"
                  min={0}
                  value={Math.abs(selected.offsetDays)}
                  onChange={(e) => {
                    const n = Math.abs(Number(e.target.value))
                    update({ offsetDays: selected.offsetDays < 0 ? -n : n })
                  }}
                />
              </label>
              <label>
                Before or after
                <select
                  value={selected.offsetDays < 0 ? 'before' : 'after'}
                  onChange={(e) => update({ offsetDays: (e.target.value === 'before' ? -1 : 1) * Math.abs(selected.offsetDays) })}
                >
                  <option value="before">before</option>
                  <option value="after">after</option>
                </select>
              </label>
              <label>
                Relative to
                <select value={selected.anchor} onChange={(e) => update({ anchor: e.target.value as Anchor })}>
                  <option value="booking">booking date</option>
                  <option value="checkIn">check-in</option>
                  <option value="checkOut">check-out</option>
                </select>
              </label>
            </div>
            <p className="muted small">Sent: {describeTiming(selected).toLowerCase()}.</p>
            <label className="block-label">
              Message
              <textarea rows={14} value={selected.body} onChange={(e) => update({ body: e.target.value })} />
            </label>
            <p className="muted small">
              Details filled in for you:{' '}
              {PLACEHOLDERS.map((p, i) => (
                <span key={p}>
                  <code>{`{${p}}`}</code>
                  {i < PLACEHOLDERS.length - 1 ? ' ' : ''}
                </span>
              ))}
            </p>
            <div className="form-actions">
              <span className="muted small">Changes save automatically.</span>
              <button className="link-button danger" onClick={remove}>Delete template</button>
            </div>
          </div>
        ) : (
          <p className="empty">Pick a template to edit it, or add a new one.</p>
        )}
      </div>
    </div>
  )
}
