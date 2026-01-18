import ical from "ical-generator";
import type { APICompetition } from "@/types/competition";

const TIMEZONE = "Europe/Dublin";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WCA_COMPETITION_URL = "https://www.worldcubeassociation.org/competitions";

function createDate(
  dateString: string,
  hours: number,
  minutes: number,
  seconds: number,
  ms: number,
): Date {
  const date = new Date(dateString);
  date.setHours(hours, minutes, seconds, ms);
  return date;
}

function createCompetitionEvent(competition: APICompetition) {
  const url = `${WCA_COMPETITION_URL}/${competition.id}`;
  const startDate = createDate(competition.date.from, 0, 0, 0, 0);
  const endDate = createDate(competition.date.till, 23, 59, 59, 999);
  const nextDay = new Date(endDate.getTime() + DAY_MS);
  nextDay.setHours(0, 0, 0, 0);

  const description = [
    `Competition ID: ${competition.id}`,
    `Venue: ${competition.venue.name}`,
    competition.venue.address && `Address: ${competition.venue.address}`,
    `\nWCA Page: ${url}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    uid: `${competition.id}-competition@speedcubingireland.com`,
    start: startDate,
    end: nextDay,
    allDay: true,
    summary: competition.name,
    description,
    location: [competition.venue.name, competition.venue.address]
      .filter(Boolean)
      .join(", "),
    url,
  };
}

function createRegistrationEvent(competition: APICompetition) {
  if (!competition.registrationOpen) return null;

  const openTime = new Date(competition.registrationOpen);
  if (Number.isNaN(openTime.getTime())) return null;

  const url = `${WCA_COMPETITION_URL}/${competition.id}`;
  return {
    uid: `${competition.id}-registration@speedcubingireland.com`,
    start: openTime,
    end: new Date(openTime.getTime() + HOUR_MS),
    allDay: false,
    summary: `${competition.name} - Registration Opens`,
    description: `Registration opens for ${competition.name}\nCompetition ID: ${competition.id}\n\nRegister at: ${url}`,
    location: "",
    url,
    timezone: TIMEZONE,
  };
}

export function generateIcalCalendar(competitions: APICompetition[]): string {
  const calendar = ical({
    prodId: {
      company: "Speedcubing Ireland",
      product: "Competitions Calendar",
      language: "EN",
    },
    name: "Speedcubing Ireland Competitions",
    description: "Irish WCA Competitions Calendar",
    timezone: TIMEZONE,
    scale: "GREGORIAN",
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const valid = competitions.filter((c) => !c.isCanceled);
  const future = valid.filter(
    (c) => createDate(c.date.till, 0, 0, 0, 0) >= today,
  );

  valid.forEach((c) => {
    calendar.createEvent(createCompetitionEvent(c));
  });
  future.forEach((c) => {
    const event = createRegistrationEvent(c);
    if (event) calendar.createEvent(event);
  });

  return calendar.toString();
}
