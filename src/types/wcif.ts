import type {
  Activity,
  Assignment,
  AssignmentCode,
  Competition,
  Event,
  Person,
  Room,
  Schedule,
  Venue,
} from "@wca/helpers";

export type {
  Competition,
  Person,
  Assignment,
  Activity,
  Schedule,
  Venue,
  Room,
  Event,
  AssignmentCode,
};

export type WCIF = Competition;

export interface ProcessedActivity {
  id: number;
  parentActivityCode: string;
  activityCode: string;
  roundStartTime: string;
  roundEndTime: string;
  timezone: string;
  roomName: string;
  roomColor: [number, number, number];
}

export interface AssignmentInfo {
  timeText: string;
  sortTime: number;
  eventCode: string;
  eventText: string;
  stageText: string;
  stageColor: [number, number, number];
  competing: number | -1;
  stationNumber: number | null;
  judging: string[];
  running: string[];
  scrambling: string[];
}

export interface DaySchedule {
  day: number;
  sortTime: number;
  assignments: Record<string, AssignmentInfo>;
  sortedAssignments: AssignmentInfo[];
}

export interface PersonScheduleInfo {
  blank: boolean;
  name: string;
  wcaid: string | null;
  compid: number | string;
  countryCode: string;
  personalSchedule: Record<number, DaySchedule>;
  sortedSchedule: DaySchedule[];
}
