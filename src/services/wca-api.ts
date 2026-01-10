import type { APICompetition } from '@/types/competition'

const WCA_API_URL = 'https://www.worldcubeassociation.org/api/v0'
const WCA_REST_API_URL = 'https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/master'

export interface WCACompetition {
  id: string
  name: string
  short_name: string
  start_date: string
  end_date: string
  city: string
  country_iso2: string
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function dateInDays(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

async function searchCompetitions(options: Record<string, string>): Promise<WCACompetition[]> {
  const params = new URLSearchParams(options)
  const res = await fetch(`${WCA_API_URL}/competitions?${params}`)
  if (!res.ok) return []
  return res.json()
}

async function searchCompetitionsRest(countryIso2: string): Promise<APICompetition[]> {
  const res = await fetch(`${WCA_REST_API_URL}/api/competitions/${countryIso2}.json`)
  if (!res.ok) return []
  const data = await res.json()
  return data.items || []
}

export async function getUpcomingIrishCompetitions(): Promise<WCACompetition[]> {
  const [irish, uk] = await Promise.all([
    searchCompetitions({ country_iso2: 'IE', start: formatDate(dateInDays(-4)), sort: 'start_date' }),
    searchCompetitions({ country_iso2: 'GB', start: formatDate(dateInDays(-4)), sort: 'start_date' }),
  ])

  const niComps = uk.filter((c) => c.city.includes('County'))
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return [...irish, ...niComps]
    .filter((c) => new Date(c.end_date) >= today)
    .sort((a, b) => Date.parse(a.start_date) - Date.parse(b.start_date))
}

export async function getCompetitionsFromNow(): Promise<APICompetition[]> {
  const [irish, uk] = await Promise.all([
    searchCompetitionsRest('IE'),
    searchCompetitionsRest('GB'),
  ])

  const niComps = uk.filter((c) => c.city.includes('County'))
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return [...irish, ...niComps]
    .filter((c) => new Date(c.date.till) >= today)
    .sort((a, b) => Date.parse(a.date.from) - Date.parse(b.date.from))
}

export async function getPastCompetitions(): Promise<APICompetition[]> {
  const [irish, uk] = await Promise.all([
    searchCompetitionsRest('IE'),
    searchCompetitionsRest('GB'),
  ])

  const niComps = uk.filter((c) => c.city.includes('County'))

  return [...irish, ...niComps].sort(
    (a, b) => Date.parse(b.date.till) - Date.parse(a.date.till)
  )
}

export async function fetchWCIF(competitionId: string) {
  const res = await fetch(`${WCA_API_URL}/competitions/${competitionId}/wcif/public`)
  if (!res.ok) throw new Error(`Failed to fetch WCIF: ${res.statusText}`)
  return res.json()
}
