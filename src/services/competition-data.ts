import type { APICompetition } from '@/types/competition'
import { fetchWCIF } from './wca-api'
import type { CurrentEventId, Person } from '@wca/helpers'

export const EVENT_TYPES_CLIPBOARD: Record<CurrentEventId, string> = {
  '333': '3x3',
  '222': '2x2',
  '444': '4x4',
  '555': '5x5',
  '666': '6x6',
  '777': '7x7',
  '333bf': '3x3 Blindfolded',
  '333fm': '3x3 Fewest Moves',
  '333oh': '3x3 One-Handed',
  'clock': 'Clock',
  'minx': 'Megaminx',
  'pyram': 'Pyraminx',
  'skewb': 'Skewb',
  'sq1': 'Square-1',
  '444bf': '4x4 Blindfolded',
  '555bf': '5x5 Blindfolded',
  '333mbf': '3x3 Multi-Blind',
}

const EVENT_ORDER: CurrentEventId[] = [
  '333', '222', '444', '555', '666', '777',
  '333bf', '333fm', '333oh', 'clock', 'minx',
  'pyram', 'skewb', 'sq1', '444bf', '555bf', '333mbf',
]

export type EventType = CurrentEventId
export type RegistrationRateType = 'mean' | 'median' | 'p75'

export interface EventRegistration {
  eventId: EventType
  eventName: string
  registrations: number
}

export interface CompetitionRegistrationData {
  competitionId: string
  competitionName: string
  date: string
  events: EventRegistration[]
  totalAttendees: number
}

export interface EventAnalysis {
  eventId: EventType
  eventName: string
  totalCompetitions: number
  competitionsWithEvent: number
  meanRegistrationRate: number
  medianRegistrationRate: number
  p75RegistrationRate: number
  minRegistrationRate: number
  maxRegistrationRate: number
}

function calculateMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  const index = (percentile / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  const weight = index - lower
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

export async function fetchSelectedCompetitionsData(
  competitions: APICompetition[],
  selectedIds: string[],
  onProgress?: (current: number, total: number, name: string) => void
): Promise<CompetitionRegistrationData[]> {
  const results: CompetitionRegistrationData[] = []
  const selected = competitions.filter((c) => selectedIds.includes(c.id))

  for (let i = 0; i < selected.length; i++) {
    const comp = selected[i]
    onProgress?.(i + 1, selected.length, comp.name)

    try {
      const wcif = await fetchWCIF(comp.id)
      const competing = wcif.persons.filter(
        (p: Person) => p.registration?.isCompeting && p.registration?.status === 'accepted'
      )

      const eventCounts: Record<string, number> = {}
      for (const person of competing) {
        for (const eventId of person.registration?.eventIds || []) {
          if (EVENT_TYPES_CLIPBOARD[eventId as EventType]) {
            eventCounts[eventId] = (eventCounts[eventId] || 0) + 1
          }
        }
      }

      results.push({
        competitionId: comp.id,
        competitionName: comp.name,
        date: comp.date.from,
        events: Object.entries(eventCounts).map(([id, count]) => ({
          eventId: id as EventType,
          eventName: EVENT_TYPES_CLIPBOARD[id as EventType],
          registrations: count,
        })),
        totalAttendees: competing.length,
      })

      await new Promise((r) => setTimeout(r, 200))
    } catch {
      results.push({
        competitionId: comp.id,
        competitionName: comp.name,
        date: comp.date.from,
        events: [],
        totalAttendees: 0,
      })
    }
  }

  return results
}

export function analyzeEventRegistrations(
  data: CompetitionRegistrationData[],
  selectedIds: string[]
): EventAnalysis[] {
  const selected = data.filter((c) => selectedIds.includes(c.competitionId))
  const eventData: Record<string, Array<{ registrations: number; total: number }>> = {}

  for (const comp of selected) {
    for (const event of comp.events) {
      if (!eventData[event.eventId]) eventData[event.eventId] = []
      eventData[event.eventId].push({
        registrations: event.registrations,
        total: comp.totalAttendees,
      })
    }
  }

  const analyses = Object.entries(eventData).map(([eventId, items]) => {
    const rates = items.map((i) => (i.total > 0 ? (i.registrations / i.total) * 100 : 0))
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length

    return {
      eventId: eventId as EventType,
      eventName: EVENT_TYPES_CLIPBOARD[eventId as EventType],
      totalCompetitions: selected.length,
      competitionsWithEvent: items.length,
      meanRegistrationRate: Math.round(mean * 100) / 100,
      medianRegistrationRate: Math.round(calculateMedian(rates) * 100) / 100,
      p75RegistrationRate: Math.round(calculatePercentile(rates, 75) * 100) / 100,
      minRegistrationRate: Math.round(Math.min(...rates) * 100) / 100,
      maxRegistrationRate: Math.round(Math.max(...rates) * 100) / 100,
    }
  })

  return EVENT_ORDER.map((eventId) => {
    const existing = analyses.find((a) => a.eventId === eventId)
    return existing || {
      eventId,
      eventName: EVENT_TYPES_CLIPBOARD[eventId],
      totalCompetitions: selected.length,
      competitionsWithEvent: 0,
      meanRegistrationRate: 0,
      medianRegistrationRate: 0,
      p75RegistrationRate: 0,
      minRegistrationRate: 0,
      maxRegistrationRate: 0,
    }
  })
}

export function getRegistrationRate(event: EventAnalysis, type: RegistrationRateType): number {
  return type === 'median' ? event.medianRegistrationRate
    : type === 'p75' ? event.p75RegistrationRate
    : event.meanRegistrationRate
}

export function getAvailableCompetitions(competitions: APICompetition[]) {
  return competitions
    .map((c) => ({ id: c.id, name: c.name, date: c.date.from, eventCount: c.events.length }))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
}
