import { Fragment, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react'
import type { AppData, MarketObservation } from '../types'
import { analyse, guestCountsFor, importMarketCsv, marketMedian, mergeMarket, snapshotsFor, type WindowAnalysis } from '../pricing'
import { money } from '../schedule'
import { fmtShort } from '../dates'

interface Props {
  data: AppData
  setData: Dispatch<SetStateAction<AppData>>
  propertyId: string
}

const POSITION_LABEL = {
  low: 'Most comparables free',
  middle: 'Normal demand',
  high: 'Most comparables sold out',
}

export function PricingView({ data, setData, propertyId }: Props) {
  const withData = data.properties.filter((p) => data.market.some((m) => m.propertyId === p.id))
  const [chosen, setChosen] = useState<string>(propertyId !== 'all' ? propertyId : withData[0]?.id ?? data.properties[0]?.id ?? '')
  const pid = propertyId !== 'all' ? propertyId : chosen
  const property = data.properties.find((p) => p.id === pid)

  const snapshots = snapshotsFor(data, pid)
  const [snapPick, setSnapPick] = useState<string | null>(null)
  const snapshot = snapPick && snapshots.includes(snapPick) ? snapPick : snapshots[snapshots.length - 1]
  const previous = snapshots[snapshots.indexOf(snapshot) - 1]

  const guestOptions = snapshot ? guestCountsFor(data, pid, snapshot) : []
  const [guestPick, setGuestPick] = useState<number | null>(null)
  const guests = guestPick && guestOptions.includes(guestPick) ? guestPick : guestOptions[0]

  const [open, setOpen] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const windows = snapshot && guests !== undefined ? analyse(data, pid, snapshot, guests) : []
  const prevWindows = previous && guests !== undefined ? new Map(analyse(data, pid, previous, guests).map((w) => [w.window, w])) : new Map()
  const nowMedian = snapshot && guests !== undefined ? marketMedian(data, pid, snapshot, guests) : undefined
  const prevMedian = previous && guests !== undefined ? marketMedian(data, pid, previous, guests) : undefined
  const fmt = (v?: number) => (v === undefined || !property ? 'No price' : money(v, property.currency))

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !pid) return
    const result = importMarketCsv(await file.text(), pid)
    if (result.error || result.rows.length === 0) {
      setMessage({ kind: 'error', text: result.error ?? 'No rows could be read. Check the column names in the README.' })
      return
    }
    setData((d) => ({ ...d, market: mergeMarket(d.market, result.rows) }))
    setSnapPick(result.snapshots[result.snapshots.length - 1])
    setMessage({
      kind: 'ok',
      text: `Imported ${result.rows.length} rows from ${result.snapshots.length} ${result.snapshots.length === 1 ? 'snapshot' : 'snapshots'} into ${property?.name}.${result.skipped ? ` ${result.skipped} rows skipped.` : ''}`,
    })
  }

  const clear = () => {
    if (!property || !confirm(`Delete all market snapshots for ${property.name}?`)) return
    setData((d) => ({ ...d, market: d.market.filter((m) => m.propertyId !== pid) }))
    setMessage(null)
  }

  return (
    <div className="view">
      <header className="view-head split">
        <div>
          <h1>Pricing</h1>
          <p className="lede">
            Your nightly price next to similar listings, date by date. The suggestion sits between the cheaper and the pricier
            listings, higher when most of them are sold out.
          </p>
        </div>
        <div className="head-actions">
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
          <button className="btn primary" onClick={() => fileRef.current?.click()} disabled={!pid}>Import snapshot</button>
        </div>
      </header>

      {message && <p className={message.kind === 'ok' ? 'callout ok' : 'callout'} role="status">{message.text}</p>}

      <div className="filters">
        {propertyId === 'all' && data.properties.length > 1 && (
          <label>
            Property
            <select value={pid} onChange={(e) => { setChosen(e.target.value); setOpen(null) }}>
              {data.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        )}
        {snapshots.length > 0 && (
          <label>
            Snapshot
            <select value={snapshot} onChange={(e) => setSnapPick(e.target.value)}>
              {[...snapshots].reverse().map((s) => <option key={s} value={s}>{fmtShort(s)}</option>)}
            </select>
          </label>
        )}
        {guestOptions.length > 1 && (
          <label>
            Guests
            <select value={guests} onChange={(e) => setGuestPick(Number(e.target.value))}>
              {guestOptions.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
        )}
      </div>

      {snapshots.length === 0 ? (
        <section className="panel">
          <h2>No market data for {property?.name ?? 'this property'} yet</h2>
          <p className="muted">
            Import a CSV with one row per listing and date window. The file stays in this browser. The README lists the columns, and
            files from the price collector scripts work as they are.
          </p>
        </section>
      ) : (
        <>
          <p className="hint market-move">
            {windows.length} date windows, {guests} guests, snapshot of {fmtShort(snapshot)}.
            {nowMedian !== undefined && prevMedian !== undefined && property && (
              <> Comparable listings moved {pct(nowMedian, prevMedian)} since {fmtShort(previous!)} (median {money(prevMedian, property.currency)} to {money(nowMedian, property.currency)}).</>
            )}
          </p>

          <div className="table-wrap">
            <table className="pricing">
              <thead>
                <tr>
                  <th scope="col">Dates</th>
                  <th scope="col" className="num">Your price</th>
                  <th scope="col" className="num">Cheaper listings</th>
                  <th scope="col" className="num">Pricier listings</th>
                  <th scope="col">Sold out</th>
                  <th scope="col" className="num">Suggested</th>
                  <th scope="col"><span className="sr-only">Details</span></th>
                </tr>
              </thead>
              <tbody>
                {windows.map((w) => {
                  const prev = prevWindows.get(w.window) as WindowAnalysis | undefined
                  const key = `${w.window}`
                  return (
                    <Fragment key={key}>
                      <tr>
                        <td>
                          <strong>{fmtShort(w.checkIn)} to {fmtShort(w.checkOut)}</strong>
                          <span className="muted block">{w.window}</span>
                        </td>
                        <td className="num">
                          {w.mine?.status === 'available' ? fmt(w.mine.nightly) : <span className="muted">{w.mine ? 'Booked or blocked' : 'Not collected'}</span>}
                          {w.mine?.nightly !== undefined && w.suggested !== undefined && (
                            <span className={`gap ${gapClass(w.mine.nightly, w.suggested)}`}>{gapText(w.mine.nightly, w.suggested)}</span>
                          )}
                        </td>
                        <td className="num">
                          {fmt(w.lower.median)}
                          <span className="muted block">{w.lower.available} of {w.lower.total} free</span>
                        </td>
                        <td className="num">
                          {fmt(w.higher.median)}
                          <span className="muted block">{w.higher.available} of {w.higher.total} free</span>
                        </td>
                        <td>
                          <span className="soldout" aria-label={`${Math.round(w.soldOut * 100)}% sold out`}>
                            <span className="soldout-bar" aria-hidden="true"><span style={{ width: `${w.soldOut * 100}%` }} /></span>
                            {Math.round(w.soldOut * 100)}%
                          </span>
                          {prev && Math.round(prev.soldOut * 100) !== Math.round(w.soldOut * 100) && (
                            <span className="muted block">was {Math.round(prev.soldOut * 100)}%</span>
                          )}
                        </td>
                        <td className="num">
                          <strong>{fmt(w.suggested)}</strong>
                          <span className="muted block">{POSITION_LABEL[w.position]}</span>
                          {w.confidence === 'thin' && <span className="flag">Few prices, check by hand</span>}
                        </td>
                        <td className="actions">
                          <button className="link-button" aria-expanded={open === key} onClick={() => setOpen(open === key ? null : key)}>
                            {open === key ? 'Hide' : 'Listings'}
                          </button>
                        </td>
                      </tr>
                      {open === key && (
                        <tr className="detail-row">
                          <td colSpan={7}>
                            <ListingDetail rows={w.observations} format={fmt} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          <p className="muted small">
            Prices are per night as guests see them. "Cheaper" and "pricier" are the groups set in the file. A listing that only sells a
            longer stay is priced from that stay.{' '}
            <button className="link-button danger" onClick={clear}>Delete market data for {property?.name}</button>
          </p>
        </>
      )}
    </div>
  )
}

function ListingDetail({ rows, format }: { rows: MarketObservation[]; format: (v?: number) => string }) {
  const tierLabel = { mine: 'Yours', higher: 'Pricier', lower: 'Cheaper' }
  return (
    <ul className="listings">
      {rows.map((o) => (
        <li key={o.listingId} className={o.tier === 'mine' ? 'mine' : ''}>
          <span className={`tier ${o.tier}`}>{tierLabel[o.tier]}</span>
          <span className="listing-name">{o.listingName}</span>
          <span className="num">
            {o.status === 'available' ? format(o.nightly) : o.status === 'unavailable' ? 'Sold out' : 'Longer stay only'}
            {o.longerStay && <span className="muted"> (longer stay)</span>}
            {o.discount && <span className="muted"> (discount shown)</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

function pct(now: number, before: number): string {
  const p = Math.round(((now - before) / before) * 100)
  return p === 0 ? 'less than 1%' : `${p > 0 ? 'up' : 'down'} ${Math.abs(p)}%`
}

function gapText(mine: number, suggested: number): string {
  const p = Math.round(((mine - suggested) / suggested) * 100)
  if (Math.abs(p) < 5) return 'In line'
  return `${Math.abs(p)}% ${p > 0 ? 'above' : 'below'}`
}

function gapClass(mine: number, suggested: number): string {
  const p = (mine - suggested) / suggested
  return Math.abs(p) < 0.05 ? 'even' : p > 0 ? 'above' : 'below'
}
