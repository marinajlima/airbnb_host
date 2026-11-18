import { useMemo, useState } from 'react'
import { useAppData } from './store'
import { buildTasks, type MessageTask } from './schedule'
import { today } from './dates'
import { TodayView } from './components/TodayView'
import { ReservationsView } from './components/ReservationsView'
import { PropertiesView } from './components/PropertiesView'
import { TemplatesView } from './components/TemplatesView'
import { MessageDrawer } from './components/MessageDrawer'

type View = 'today' | 'reservations' | 'properties' | 'templates'

const NAV: { id: View; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'reservations', label: 'Reservations' },
  { id: 'properties', label: 'Properties' },
  { id: 'templates', label: 'Message templates' },
]

export default function App() {
  const { data, setData, resetDemo } = useAppData()
  const [view, setView] = useState<View>('today')
  const [propertyId, setPropertyId] = useState<string>('all')
  const [openTaskKey, setOpenTaskKey] = useState<string | null>(null)

  const now = today()
  const tasks = useMemo(() => buildTasks(data, propertyId, now), [data, propertyId, now])
  const openTask = tasks.find((t) => t.key === openTaskKey) ?? null
  const pending = tasks.filter((t) => t.state === 'overdue' || t.state === 'today').length

  const toggleSent = (task: MessageTask) => {
    setData((d) => {
      const exists = d.sent.some((s) => s.reservationId === task.reservation.id && s.templateId === task.template.id)
      return {
        ...d,
        sent: exists
          ? d.sent.filter((s) => !(s.reservationId === task.reservation.id && s.templateId === task.template.id))
          : [...d.sent, { reservationId: task.reservation.id, templateId: task.template.id, sentOn: now }],
      }
    })
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <svg viewBox="0 0 32 32" aria-hidden="true" width="28" height="28">
            <path d="M3 19c3.5 0 3.5-3 7-3s3.5 3 7 3 3.5-3 7-3 3.5 3 6 3" fill="none" stroke="#E3D3AE" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="16" cy="9" r="3" fill="#7FC3B2" />
          </svg>
          <span>StayOps</span>
        </div>

        <nav aria-label="Main">
          {NAV.map((n) => (
            <button key={n.id} className={view === n.id ? 'nav-item active' : 'nav-item'} onClick={() => setView(n.id)}>
              {n.label}
              {n.id === 'today' && pending > 0 && <span className="badge" aria-label={`${pending} messages to send`}>{pending}</span>}
            </button>
          ))}
        </nav>

        <label className="property-filter">
          <span>Showing</span>
          <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="all">All properties</option>
            {data.properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        <div className="sidebar-foot">
          <p>Data is saved in this browser only.</p>
          <button
            className="link-button"
            onClick={() => {
              if (confirm('Replace everything with the demo data?')) resetDemo()
            }}
          >
            Reset demo data
          </button>
        </div>
      </aside>

      <main className="main">
        {view === 'today' && <TodayView data={data} tasks={tasks} propertyId={propertyId} onOpenTask={(t) => setOpenTaskKey(t.key)} />}
        {view === 'reservations' && <ReservationsView data={data} setData={setData} propertyId={propertyId} />}
        {view === 'properties' && <PropertiesView data={data} setData={setData} />}
        {view === 'templates' && <TemplatesView data={data} setData={setData} />}
      </main>

      {openTask && <MessageDrawer task={openTask} onClose={() => setOpenTaskKey(null)} onToggleSent={() => toggleSent(openTask)} />}
    </div>
  )
}
