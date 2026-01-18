import { NextResponse } from "next/server";
import { generateIcalCalendar } from "@/services/calendar/ical-generator";
import { fetchCompetition } from "@/services/wca/official";
import { getAllCompetitions } from "@/services/wca/unofficial";

const CACHE_MAX_AGE = 10800;
const STALE_WHILE_REVALIDATE = 86400;

export async function GET() {
  try {
    const competitions = await getAllCompetitions();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureCompetitions = competitions.filter(
      (c) => new Date(c.date.till) >= today,
    );

    await Promise.all(
      futureCompetitions.map(async (comp) => {
        try {
          const official = await fetchCompetition(comp.id);
          if (official.registration_open) {
            comp.registrationOpen = official.registration_open;
          }
          if (official.registration_close) {
            comp.registrationClose = official.registration_close;
          }
        } catch (e) {
          console.error(`Failed to fetch official WCA data for ${comp.id}`, e);
        }
      }),
    );

    const ical = generateIcalCalendar(competitions);

    return new NextResponse(ical, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="competitions.ics"',
        "Cache-Control": `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error generating calendar:", errorMessage);
    return new NextResponse(`Error generating calendar: ${errorMessage}`, {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
