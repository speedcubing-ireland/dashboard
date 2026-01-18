import type { APICompetition } from "@/types/competition";
import { dateInDays, formatDate, isNorthernIreland, today } from "./utils";

const API_BASE =
  "https://raw.githubusercontent.com/simonkellly/wca-analysis/api";

interface UnofficialAPICompetition {
  id: string;
  name: string;
  city: string;
  country: string;
  date: { from: string; till: string; numberOfDays: number };
  isCanceled: boolean;
  events: string[];
  registrationOpen?: string | null;
  registrationClose?: string | null;
  venue: {
    name: string;
    address: string;
    details?: string;
    coordinates?: { latitude: number; longitude: number };
  };
  wcaDelegates?: Array<{ name: string; email: string }>;
  organisers?: Array<{ name: string; email: string }>;
  information?: string;
  externalWebsite?: string;
}

function mapToAPICompetition(data: UnofficialAPICompetition): APICompetition {
  return {
    id: data.id,
    name: data.name,
    city: data.city,
    country: data.country,
    date: data.date,
    isCanceled: data.isCanceled,
    events: data.events,
    registrationOpen: data.registrationOpen ?? undefined,
    registrationClose: data.registrationClose ?? undefined,
    wcaDelegates: data.wcaDelegates || [],
    organisers: data.organisers || [],
    venue: data.venue,
    information: data.information,
    externalWebsite: data.externalWebsite,
  };
}

async function fetchCompetitionsByCountry(
  country: string,
  start?: string,
  end?: string,
): Promise<UnofficialAPICompetition[]> {
  const res = await fetch(`${API_BASE}/competitions/${country}.json`);
  if (!res.ok) return [];

  const data = await res.json();
  const competitions: UnofficialAPICompetition[] = data.items || [];

  if (start && end) {
    return competitions.filter(
      (c) => c.date.from >= start && c.date.till <= end,
    );
  }
  if (start) {
    return competitions.filter((c) => c.date.from >= start);
  }
  if (end) {
    return competitions.filter((c) => c.date.till <= end);
  }

  return competitions;
}

async function fetchIrishCompetitions(
  start?: string,
  end?: string,
): Promise<APICompetition[]> {
  const [irish, uk] = await Promise.all([
    fetchCompetitionsByCountry("IE", start, end),
    fetchCompetitionsByCountry("GB", start, end),
  ]);

  const niComps = uk.filter((c) => isNorthernIreland(c.city));
  return [...irish, ...niComps]
    .map(mapToAPICompetition)
    .sort((a, b) => Date.parse(a.date.from) - Date.parse(b.date.from));
}

export async function getUpcomingIrishCompetitions(): Promise<
  APICompetition[]
> {
  const competitions = await fetchIrishCompetitions(formatDate(dateInDays(-4)));
  return competitions.filter((c) => new Date(c.date.till) >= today());
}

export async function getCompetitionsFromNow(): Promise<APICompetition[]> {
  const competitions = await fetchIrishCompetitions(
    formatDate(dateInDays(-180)),
    formatDate(dateInDays(365)),
  );
  return competitions.filter((c) => new Date(c.date.till) >= today());
}

export async function getPastCompetitions(): Promise<APICompetition[]> {
  return (
    await fetchIrishCompetitions(undefined, formatDate(dateInDays(-180)))
  ).sort((a, b) => Date.parse(b.date.till) - Date.parse(a.date.till));
}

export async function getAllCompetitions(): Promise<APICompetition[]> {
  return (
    await fetchIrishCompetitions("1980-01-01", formatDate(dateInDays(3650)))
  ).sort((a, b) => Date.parse(b.date.till) - Date.parse(a.date.till));
}
