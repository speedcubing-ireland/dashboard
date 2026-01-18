import type { Competition } from "@wca/helpers";

const API_URL = "https://www.worldcubeassociation.org/api/v0";

export interface WCARegistration {
  id: number;
  competition_id: string;
  user_id: number;
  event_ids: string[];
}

interface OfficialWCADelegate {
  name: string;
  email: string;
}

interface OfficialWCAOrganizer {
  name: string;
  email: string;
}

export interface OfficialAPICompetition {
  id: string;
  name: string;
  city: string;
  country_iso2: string;
  start_date: string;
  end_date: string;
  registration_open: string | null;
  registration_close: string | null;
  cancelled_at: string | null;
  event_ids: string[];
  delegates: OfficialWCADelegate[];
  organizers: OfficialWCAOrganizer[];
  venue: string;
  venue_address: string;
  venue_details: string;
  latitude_degrees: number;
  longitude_degrees: number;
  external_website: string | null;
}

async function fetchFromAPI<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchCompetitionRegistrations(
  competitionId: string,
): Promise<WCARegistration[]> {
  return fetchFromAPI(`/competitions/${competitionId}/registrations`);
}

export async function fetchCompetition(
  competitionId: string,
): Promise<OfficialAPICompetition> {
  return fetchFromAPI(`/competitions/${competitionId}`);
}

export async function fetchWCIF(competitionId: string): Promise<Competition> {
  return fetchFromAPI(`/competitions/${competitionId}/wcif/public`);
}
