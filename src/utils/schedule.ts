import type { Assignment, Competition, Person } from "@wca/helpers";
import moment from "moment-timezone";
import { EVENT_MAP } from "@/constants";
import type { BadgeRole } from "@/types/badge";
import type {
  DaySchedule,
  PersonScheduleInfo,
  ProcessedActivity,
} from "@/types/wcif";
import { hexToRgb } from "./pdf";

const DELEGATE_WCA_IDS = new Set([
  "2015NICH04",
  "2019TIMM01",
  "2016BEAU03",
  "2015HENN02",
  "2010CHAN20",
  "2019KLEV01",
  "2023CASE06",
  "2017OTOO03",
  "2017KELL08",
]);

// Resolved manually against the IrishChampionship2026 public WCIF. Using WCA
// IDs avoids ambiguity for the first-name-only entries in the supplied list.
const VOLUNTEER_WCA_IDS = new Set([
  "2022OSHE02", // Chris O'Shea
  "2019BACO02", // Ollie Bacon
  "2025HARF03", // Steven Harford
  "2021DOHE02", // Kalin Doherty
  "2021FINK02", // Ronan Finke
  "2018SMIT37", // Conor Smith
  "2019BURK05", // Rían Burke
  "2023KELL23", // Jane Kelly
  "2024QUIN29", // Nathan Quinlan
  "2024DOWL02", // Aoife Dowling
  "2019BROW10", // Aidan Browne
  "2021CHOD01", // Daniel Cho
]);

const SUPPLEMENTAL_VOLUNTEER_NAMES = [
  "Aoife Tierney",
  "Caitriona O’Reilly",
  "Caitríona Ó Torna",
  "Fiona Olwill",
  "Kenneth Kirrane",
  "Jen Keeshan",
  "PJ Dillon",
];

function getBadgeRole(wcaId: string | null | undefined): BadgeRole {
  if (wcaId && DELEGATE_WCA_IDS.has(wcaId)) return "delegate";
  if (wcaId && VOLUNTEER_WCA_IDS.has(wcaId)) return "volunteer";
  return "competitor";
}

export function buildSupplementalBadges(): PersonScheduleInfo[] {
  const volunteers = SUPPLEMENTAL_VOLUNTEER_NAMES.map((name) => ({
    blank: false,
    badgeRole: "volunteer" as const,
    badgeOnly: true,
    name,
    wcaid: "VOLUNTEER",
    compid: "VOL",
    countryCode: "ie",
    personalSchedule: {},
    sortedSchedule: [],
  }));
  const media = Array.from({ length: 6 }, (_, index) => ({
    blank: false,
    badgeRole: "media" as const,
    badgeOnly: true,
    name: "",
    wcaid: null,
    compid: `media-${index + 1}`,
    countryCode: "",
    personalSchedule: {},
    sortedSchedule: [],
  }));

  return [...volunteers, ...media];
}

function processAssignment(
  assignment: Assignment,
  activity: ProcessedActivity,
  daySchedule: DaySchedule,
) {
  const codes = activity.activityCode.split("-");
  const parentCode = activity.parentActivityCode;

  if (!daySchedule.assignments[parentCode]) {
    const start = moment(activity.roundStartTime).tz(activity.timezone);
    const end = moment(activity.roundEndTime).tz(activity.timezone);
    const event = codes[0];

    daySchedule.assignments[parentCode] = {
      timeText: `${start.format("HH:mm")} - ${end.format("HH:mm")}`,
      sortTime: start.unix(),
      eventCode: event,
      eventText: EVENT_MAP[event] || event,
      stageText: activity.roomName,
      stageColor: activity.roomColor,
      competing: -1,
      stationNumber: null,
      judging: [],
      running: [],
      scrambling: [],
    };
  }

  const info = daySchedule.assignments[parentCode];
  const group = codes[2] || "-1";
  const code = assignment.assignmentCode;

  if (code === "competitor") {
    info.competing = parseInt(group.substring(1), 10);
    info.stationNumber = assignment.stationNumber;
  } else if (code === "staff-judge") {
    info.judging.push(group.substring(1));
  } else if (code === "staff-runner") {
    info.running.push(group.substring(1));
  } else if (code === "staff-scrambler") {
    info.scrambling.push(group.substring(1));
  }
}

export function buildPersonSchedule(
  person: Person,
  activities: Record<number, ProcessedActivity>,
): PersonScheduleInfo {
  const personalSchedule: Record<number, DaySchedule> = {};

  for (const assignment of person.assignments || []) {
    const activity = activities[assignment.activityId];
    if (!activity) continue;

    const start = moment(activity.roundStartTime).tz(activity.timezone);
    const day = start.day();

    if (!personalSchedule[day]) {
      personalSchedule[day] = {
        day,
        sortTime: start.unix(),
        assignments: {},
        sortedAssignments: [],
      };
    }

    processAssignment(assignment, activity, personalSchedule[day]);
  }

  const sortedSchedule = Object.values(personalSchedule).sort(
    (a, b) => a.sortTime - b.sortTime,
  );
  sortedSchedule.forEach((ds) => {
    ds.sortedAssignments = Object.values(ds.assignments).sort((a, b) => {
      if (a.sortTime !== b.sortTime) return a.sortTime - b.sortTime;
      return a.eventCode.localeCompare(b.eventCode);
    });
  });

  return {
    blank: false,
    badgeRole: getBadgeRole(person.wcaId),
    name: person.name,
    wcaid: person.wcaId ?? null,
    compid: person.registrantId,
    countryCode: person.countryIso2.toLowerCase(),
    personalSchedule,
    sortedSchedule,
  };
}

export function reorganizeActivities(
  wcif: Competition,
): Record<number, ProcessedActivity> {
  const activities: Record<number, ProcessedActivity> = {};

  for (const venue of wcif.schedule.venues) {
    for (const room of venue.rooms) {
      const roomColorRgb = hexToRgb(room.color);
      const roomColor: [number, number, number] = roomColorRgb
        ? [
            Math.floor((255 + roomColorRgb[0]) / 2),
            Math.floor((255 + roomColorRgb[1]) / 2),
            Math.floor((255 + roomColorRgb[2]) / 2),
          ]
        : [255, 255, 255];

      for (const activity of room.activities) {
        const base = {
          parentActivityCode: activity.activityCode,
          roundStartTime: activity.startTime,
          roundEndTime: activity.endTime,
          timezone: venue.timezone,
          roomName: room.name,
          roomColor,
        };

        activities[activity.id] = {
          id: activity.id,
          activityCode: activity.activityCode,
          ...base,
        };

        for (const child of activity.childActivities) {
          activities[child.id] = {
            id: child.id,
            activityCode: child.activityCode,
            ...base,
          };
        }
      }
    }
  }

  return activities;
}

export function chooseFont(text: string): string {
  if (!text || text.length === 0) return "NotoSans-Regular";

  const code = text.charCodeAt(0);

  if (code >= 0x0000 && code <= 0x052f) return "NotoSans-Regular";
  if ((code >= 0x0600 && code <= 0x06ff) || (code >= 0x0750 && code <= 0x077f))
    return "NotoSansArabic";
  if (code >= 0x0e00 && code <= 0x0e7f) return "NotoSansThai";
  if (code >= 0x0530 && code <= 0x058f) return "NotoSansArmenian";
  if (code >= 0x10a0 && code <= 0x10ff) return "NotoSansGeorgian";
  return "NotoSansSC";
}

export function parseLocalName(text: string): {
  latinName: string;
  localName: string | null;
} {
  const match = text.match(/(.*)\s*[(（](.+)[)）]/);
  if (match) return { latinName: match[1].trim(), localName: match[2].trim() };
  return { latinName: text, localName: null };
}

export function removeStageWord(text: string): string {
  return text
    .replace(/\bstages?\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
