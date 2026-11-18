import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import type { AppData, Incident, IncidentCategory, PlaybookEntry } from '../types'
import { INCIDENT_CATEGORY, incidentsForRule, needsRule, ruleFor, situationKey } from '../playbook'
import { fmtShort, today, uid } from '../dates'

interface Props {
  data: AppData
  setData: Dispatch<SetStateAction<AppData>>
  propertyId: string
}

type Editing =
  | { kind: 'incident'; value: Incident }
  | { kind: 'rule'; value: PlaybookEntry }
  | null

export function PlaybookView({ data, setData, propertyId }: Props) {
  const [editing, setEditing] = useState<Editing>(null)
  const now = today()
  const props = new Map(data.properties.map((p) => [p.id, p]))
  const stays = new Map(data.reservations.map((r) => [r.id, r]))

  const suggestions = needsRule(data, propertyId)
  const rules = data.playbook
    .filter((e) => propertyId === 'all' || e.propertyId === 'all' || e.propertyId === propertyId)
    .sort((a, b) => a.situation.localeCompare(b.situation))
  const log = data.incidents
    .filter((i) => propertyId === 'all' || i.propertyId === propertyId)
    .sort((a, b) => b.date.localeCompare(a.date))

  const blankIncident = (): Incident => ({
    id: '',
    propertyId: propertyId !== 'all' ? propertyId : data.properties[0]?.id ?? '',
    date: now,
    category: 'request',
    situation: '',
    whatHappened: '',
    howHandled: '',
    status: 'open',
  })

  const blankRule = (from?: { situation: string; category: IncidentCategory; propertyId: string }): PlaybookEntry => ({
    id: '',
    situation: from?.situation ?? '',
    category: from?.category ?? 'request',
    propertyId: from?.propertyId ?? 'all',
    rule: '',
    updatedOn: now,
  })

  const saveIncident = (i: Incident) => {
    setData((d) => ({
      ...d,
      incidents: i.id ? d.incidents.map((x) => (x.id === i.id ? i : x)) : [...d.incidents, { ...i, id: uid() }],
    }))
    setEditing(null)
  }

  const saveRule = (e: PlaybookEntry) => {
    const entry = { ...e, updatedOn: now }
    setData((d) => ({
      ...d,
      playbook: e.id ? d.playbook.map((x) => (x.id === e.id ? entry : x)) : [...d.playbook, { ...entry, id: uid() }],
    }))
    setEditing(null)
  }

  const toggleStatus = (i: Incident) =>
    setData((d) => ({
      ...d,
      incidents: d.incidents.map((x) => (x.id === i.id ? { ...x, status: x.status === 'open' ? 'resolved' : 'open' } : x)),
    }))

  const removeIncident = (i: Incident) => {
    if (!confirm(`Delete the incident "${i.situation}" from ${fmtShort(i.date)}?`)) return
    setData((d) => ({ ...d, incidents: d.incidents.filter((x) => x.id !== i.id) }))
  }

  const removeRule = (e: PlaybookEntry) => {
    if (!confirm(`Delete the rule for "${e.situation}"? The incidents stay in the log.`)) return
    setData((d) => ({ ...d, playbook: d.playbook.filter((x) => x.id !== e.id) }))
  }

  return (
    <div className="view">
      <header className="view-head split">
        <div>
          <h1>Playbook</h1>
          <p className="lede">Log what goes wrong in a stay. When a situation repeats, turn it into a rule for next time.</p>
        </div>
        <div className="head-actions">
          <button className="btn" onClick={() => setEditing({ kind: 'rule', value: blankRule() })}>Add rule</button>
          <button className="btn primary" onClick={() => setEditing({ kind: 'incident', value: blankIncident() })} disabled={data.properties.length === 0}>
            Log incident
          </button>
        </div>
      </header>

      {editing?.kind === 'incident' && <IncidentForm data={data} initial={editing.value} onSave={saveIncident} onCancel={() => setEditing(null)} />}
      {editing?.kind === 'rule' && <RuleForm data={data} initial={editing.value} onSave={saveRule} onCancel={() => setEditing(null)} />}

      {suggestions.length > 0 && (
        <section aria-labelledby="needs-h">
          <h2 id="needs-h">Happened again, no rule yet</h2>
          <ul className="rows">
            {suggestions.map((g) => (
              <li key={`${g.propertyId}:${g.key}`} className="row">
                <span className="count-chip" aria-label={`${g.incidents.length} times`}>{g.incidents.length}×</span>
                <div className="row-main">
                  <strong>{g.situation}</strong>
                  <span className="muted">
                    {props.get(g.propertyId)?.name}, last on {fmtShort(g.incidents[0].date)}. Last time: {g.incidents[0].howHandled}
                  </span>
                </div>
                <button className="btn primary" onClick={() => setEditing({ kind: 'rule', value: blankRule(g) })}>Write rule</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="rules-h">
        <h2 id="rules-h">Rules</h2>
        {rules.length === 0 ? (
          <p className="empty">No rules yet. Write one when a situation happens for the second time.</p>
        ) : (
          <ul className="rules">
            {rules.map((e) => {
              const based = incidentsForRule(data, e)
              return (
                <li key={e.id} className="rule">
                  <div className="rule-head">
                    <h3>{e.situation}</h3>
                    <span className="muted small">
                      {INCIDENT_CATEGORY[e.category]}, {e.propertyId === 'all' ? 'all properties' : props.get(e.propertyId)?.name}
                    </span>
                  </div>
                  <p className="rule-text">{e.rule}</p>
                  <div className="property-foot">
                    <span className="muted small">
                      Based on {based.length} {based.length === 1 ? 'incident' : 'incidents'}. Updated {fmtShort(e.updatedOn)}.
                    </span>
                    <span>
                      <button className="link-button" onClick={() => setEditing({ kind: 'rule', value: e })}>Edit</button>
                      <button className="link-button danger" onClick={() => removeRule(e)}>Delete</button>
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="log-h">
        <h2 id="log-h">Incident log</h2>
        {log.length === 0 ? (
          <p className="empty">Nothing logged. Use "Log incident" the next time something needs handling.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Situation</th>
                  <th scope="col">How it was handled</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {log.map((i) => {
                  const stay = i.reservationId ? stays.get(i.reservationId) : undefined
                  return (
                    <tr key={i.id}>
                      <td>{fmtShort(i.date)}</td>
                      <td className="wide-cell">
                        <strong>{i.situation}</strong>
                        <span className="muted block">
                          {props.get(i.propertyId)?.name}
                          {stay ? `, ${stay.guestName}` : ''}
                        </span>
                        <span className="note">{i.whatHappened}</span>
                      </td>
                      <td className="wide-cell">{i.howHandled}</td>
                      <td>
                        <label className="check">
                          <input type="checkbox" checked={i.status === 'resolved'} onChange={() => toggleStatus(i)} />
                          {i.status === 'resolved' ? 'Resolved' : 'Open'}
                        </label>
                      </td>
                      <td className="actions">
                        <button className="link-button" onClick={() => setEditing({ kind: 'incident', value: i })}>Edit</button>
                        <button className="link-button danger" onClick={() => removeIncident(i)}>Delete</button>
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

function IncidentForm({
  data,
  initial,
  onSave,
  onCancel,
}: {
  data: AppData
  initial: Incident
  onSave: (i: Incident) => void
  onCancel: () => void
}) {
  const [i, setI] = useState(initial)
  const set = <K extends keyof Incident>(k: K, v: Incident[K]) => setI((x) => ({ ...x, [k]: v }))
  const stays = data.reservations.filter((r) => r.propertyId === i.propertyId).sort((a, b) => b.checkIn.localeCompare(a.checkIn))
  const known = [...new Map(data.incidents.map((x) => [situationKey(x.situation), x.situation.trim()])).values()]
  const rule = ruleFor(data, i.situation, i.propertyId)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (i.situation.trim()) onSave({ ...i, situation: i.situation.trim() })
  }

  return (
    <form className="panel form" onSubmit={submit}>
      <h2>{initial.id ? 'Edit incident' : 'Log an incident'}</h2>
      <div className="grid">
        <label className="wide">
          Situation
          <input required list="situations" value={i.situation} onChange={(e) => set('situation', e.target.value)} placeholder="Late checkout, baby cot request" autoFocus />
          <datalist id="situations">
            {known.map((s) => <option key={s} value={s} />)}
          </datalist>
        </label>
        {rule && (
          <div className="wide rule-hint" role="status">
            <strong>Your rule for this:</strong> {rule.rule}
          </div>
        )}
        <label>
          Property
          <select value={i.propertyId} onChange={(e) => setI((x) => ({ ...x, propertyId: e.target.value, reservationId: undefined }))}>
            {data.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>
          Stay
          <select value={i.reservationId ?? ''} onChange={(e) => set('reservationId', e.target.value || undefined)}>
            <option value="">Not linked to a stay</option>
            {stays.map((r) => (
              <option key={r.id} value={r.id}>{r.guestName}, {fmtShort(r.checkIn)}</option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select value={i.category} onChange={(e) => set('category', e.target.value as IncidentCategory)}>
            {Object.entries(INCIDENT_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label>
          Date
          <input type="date" required value={i.date} onChange={(e) => set('date', e.target.value)} />
        </label>
        <label className="wide">
          What happened
          <textarea rows={2} value={i.whatHappened} onChange={(e) => set('whatHappened', e.target.value)} />
        </label>
        <label className="wide">
          How it was handled
          <textarea rows={2} value={i.howHandled} onChange={(e) => set('howHandled', e.target.value)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={i.status === 'resolved'} onChange={(e) => set('status', e.target.checked ? 'resolved' : 'open')} />
          Resolved
        </label>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn primary">{initial.id ? 'Save changes' : 'Log incident'}</button>
        <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function RuleForm({
  data,
  initial,
  onSave,
  onCancel,
}: {
  data: AppData
  initial: PlaybookEntry
  onSave: (e: PlaybookEntry) => void
  onCancel: () => void
}) {
  const [e, setE] = useState(initial)
  const set = <K extends keyof PlaybookEntry>(k: K, v: PlaybookEntry[K]) => setE((x) => ({ ...x, [k]: v }))
  const past = data.incidents
    .filter((i) => situationKey(i.situation) === situationKey(e.situation) && (e.propertyId === 'all' || i.propertyId === e.propertyId))
    .sort((a, b) => b.date.localeCompare(a.date))

  const submit = (ev: FormEvent) => {
    ev.preventDefault()
    if (e.situation.trim() && e.rule.trim()) onSave({ ...e, situation: e.situation.trim(), rule: e.rule.trim() })
  }

  return (
    <form className="panel form" onSubmit={submit}>
      <h2>{initial.id ? 'Edit rule' : 'New rule'}</h2>
      <div className="grid">
        <label className="wide">
          Situation
          <input required value={e.situation} onChange={(ev) => set('situation', ev.target.value)} autoFocus={!initial.situation} />
        </label>
        <label>
          Type
          <select value={e.category} onChange={(ev) => set('category', ev.target.value as IncidentCategory)}>
            {Object.entries(INCIDENT_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label>
          Applies to
          <select value={e.propertyId} onChange={(ev) => set('propertyId', ev.target.value)}>
            <option value="all">All properties</option>
            {data.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        {past.length > 0 && (
          <div className="wide past">
            <span className="muted small">How it was handled before:</span>
            <ul>
              {past.map((i) => (
                <li key={i.id}>
                  <b>{fmtShort(i.date)}</b> {i.howHandled}
                </li>
              ))}
            </ul>
          </div>
        )}
        <label className="wide">
          What to do next time
          <textarea required rows={4} value={e.rule} onChange={(ev) => set('rule', ev.target.value)} autoFocus={!!initial.situation} />
        </label>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn primary">{initial.id ? 'Save changes' : 'Save rule'}</button>
        <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
