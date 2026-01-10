import { useState } from 'react'
import { getCompetitionsFromNow, fetchWCIF } from '@/services/wca-api'
import type { Event, EventId } from '@wca/helpers'
import type { Person } from '@wca/helpers'

const EVENTS = [
  { id: '333', name: '3x3 ' },
  { id: '222', name: '2x2 ' },
  { id: '444', name: '4x4 ' },
  { id: '555', name: '5x5 ' },
  { id: '666', name: '6x6 ' },
  { id: '777', name: '7x7 ' },
  { id: '333bf', name: '3BLD' },
  { id: '333fm', name: 'FMC ' },
  { id: '333oh', name: '3OH ' },
  { id: 'clock', name: 'Clk ' },
  { id: 'minx', name: 'Mega' },
  { id: 'pyram', name: 'Pyr ' },
  { id: 'skewb', name: 'Skb ' },
  { id: 'sq1', name: 'SQ-1' },
  { id: '444bf', name: '4BLD' },
  { id: '555bf', name: '5BLD' },
  { id: '333mbf', name: 'MBLD' },
]

export interface StatsData {
  compData: Array<{
    Name: string
    'Reg Start': string
    'Start Date': string
    Location: string
    Competitors: string
  }>
  rounds: Array<Record<string, string | number>>
  signups: Array<Record<string, string>>
  rawSignups: Array<Record<string, string | number>>
}

export function useStatistics() {
  const [statsData, setStatsData] = useState<StatsData | null>(null)
  const [generating, setGenerating] = useState(false)
  const [showRawNumbers, setShowRawNumbers] = useState(false)

  const generateStatistics = async () => {
    try {
      setGenerating(true)
      const compSearch = await getCompetitionsFromNow()
      const comps = await Promise.all(compSearch.map((c) => fetchWCIF(c.id)))
      const sorted = comps.sort((a: any, b: any) =>
        a.schedule.startDate.localeCompare(b.schedule.startDate)
      )

      const compData = sorted.map((comp: any) => {
        const reg = comp.persons.filter(
          (p: any) => p.registration?.isCompeting && p.registration?.status === 'accepted'
        ).length
        const closed = new Date(comp.registrationInfo.closeTime) < new Date() ? ' (Closed)' : ''
        return {
          Name: comp.name,
          'Reg Start': comp.registrationInfo.openTime.substring(0, 10),
          'Start Date': comp.schedule.startDate,
          Location: comp.schedule.venues[0]?.name || '',
          Competitors: `${reg}/${comp.competitorLimit}${closed}`,
        }
      })

      const rounds = sorted.map((comp) => {
        const eventData: Record<string, number | string> = {}
        for (const ev of EVENTS) {
          const info = comp.events.find((e: Event) => e.id === ev.id)
          eventData[ev.name] = info?.rounds.length || ''
        }
        const totalRounds = Object.values(eventData).reduce((a: number, c) => a + (Number(c) || 0), 0)
        const totalEvents = Object.values(eventData).filter((v) => v !== '').length
        return { Name: comp.name, Rounds: totalRounds, Events: totalEvents, ...eventData }
      })

      const withReg = comps.filter((c) => c.persons.some((p: Person) => p.registration))
      const signups = withReg.map((comp) => {
        const regged = comp.persons.filter(
          (p: Person) => p.registration?.isCompeting && p.registration?.status === 'accepted'
        )
        const eventData: Record<string, string> = {}
        for (const ev of EVENTS) {
          const count = regged.filter((p: Person) => p.registration?.eventIds.includes(ev.id as EventId)).length
          const info = comp.events.find((e: Event) => e.id === ev.id)
          const pct = Math.round((count / regged.length) * 100).toString().padStart(2, '0')
          eventData[ev.name] = info ? `${pct}%` : ''
        }
        return { Name: comp.name, ...eventData }
      })

      const rawSignups = withReg.map((comp) => {
        const regged = comp.persons.filter(
          (p: Person) => p.registration?.isCompeting && p.registration?.status === 'accepted'
        )
        const eventData: Record<string, string | number> = {}
        for (const ev of EVENTS) {
          const count = regged.filter((p: Person) => p.registration?.eventIds.includes(ev.id as EventId)).length
          const info = comp.events.find((e: Event) => e.id === ev.id)
          eventData[ev.name] = info ? count : ''
        }
        return { Name: comp.name, ...eventData }
      })

      setStatsData({ compData, rounds, signups, rawSignups })
    } catch {
      setGenerating(false)
    }
  }

  return { statsData, generating, showRawNumbers, setShowRawNumbers, generateStatistics }
}
