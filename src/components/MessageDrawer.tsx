import { useEffect, useRef, useState } from 'react'
import type { MessageTask } from '../schedule'
import { fillTemplate } from '../schedule'
import { fmtLong, fmtShort } from '../dates'

interface Props {
  task: MessageTask
  onClose: () => void
  onToggleSent: () => void
}

export function MessageDrawer({ task, onClose, onToggleSent }: Props) {
  const text = fillTemplate(task.template.body, task.reservation, task.property)
  const [copied, setCopied] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="scrim" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <div>
            <h2 id="drawer-title">{task.template.name}</h2>
            <p className="muted">
              To {task.reservation.guestName}, {task.property.name}. Due {fmtLong(task.due)}.
            </p>
          </div>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <pre className="message">{text}</pre>

        <footer className="drawer-foot">
          <button className="btn" onClick={copy}>{copied ? 'Copied' : 'Copy message'}</button>
          <button className={task.sent ? 'btn ghost' : 'btn primary'} onClick={onToggleSent}>
            {task.sent ? 'Mark as not sent' : 'Mark as sent'}
          </button>
          {task.sent && <span className="muted small">Sent on {fmtShort(task.sent.sentOn)}</span>}
        </footer>
      </aside>
    </div>
  )
}
