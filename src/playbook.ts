import type { AppData, Incident, IncidentCategory, PlaybookEntry } from './types'

export const INCIDENT_CATEGORY: Record<IncidentCategory, string> = {
  checkinout: 'Check-in and checkout',
  request: 'Guest request',
  maintenance: 'Maintenance',
  damage: 'Damage',
  cleaning: 'Cleaning',
  noise: 'Noise and neighbours',
  other: 'Other',
}

/** Situations are compared ignoring case and extra spaces, so "Late checkout" and "late checkout " are one. */
export function situationKey(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function ruleFor(data: AppData, situation: string, propertyId: string): PlaybookEntry | undefined {
  const key = situationKey(situation)
  if (!key) return undefined
  return data.playbook.find((e) => situationKey(e.situation) === key && (e.propertyId === 'all' || e.propertyId === propertyId))
}

export interface SituationGroup {
  key: string
  situation: string
  category: IncidentCategory
  propertyId: string
  incidents: Incident[]
}

/**
 * A situation that happened at least twice at the same property with no rule covering it.
 * This is the moment a one-off fix should become a house rule.
 */
export function needsRule(data: AppData, propertyId: string | 'all'): SituationGroup[] {
  const groups = new Map<string, SituationGroup>()
  for (const i of data.incidents) {
    if (propertyId !== 'all' && i.propertyId !== propertyId) continue
    const key = situationKey(i.situation)
    const id = `${i.propertyId}:${key}`
    const g = groups.get(id) ?? { key, situation: i.situation.trim(), category: i.category, propertyId: i.propertyId, incidents: [] }
    g.incidents.push(i)
    groups.set(id, g)
  }
  return [...groups.values()]
    .filter((g) => g.incidents.length >= 2 && !ruleFor(data, g.situation, g.propertyId))
    .map((g) => ({ ...g, incidents: g.incidents.sort((a, b) => b.date.localeCompare(a.date)) }))
}

/** Incidents a rule is based on: same situation, at the properties it covers. */
export function incidentsForRule(data: AppData, entry: PlaybookEntry): Incident[] {
  const key = situationKey(entry.situation)
  return data.incidents.filter(
    (i) => situationKey(i.situation) === key && (entry.propertyId === 'all' || entry.propertyId === i.propertyId),
  )
}
