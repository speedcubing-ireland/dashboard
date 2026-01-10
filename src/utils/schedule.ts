import type { Person, Competition } from '@wca/helpers'
import moment from 'moment-timezone'
import { hexToRgb } from './pdf'
import { EVENT_MAP } from '@/constants'
import type { ProcessedActivity, PersonScheduleInfo, DaySchedule } from '@/types/wcif'

function processAssignment(assignment: any, activity: ProcessedActivity, daySchedule: DaySchedule) {
  const codes = activity.activityCode.split('-')
  const parentCode = activity.parentActivityCode
  
  if (!daySchedule.assignments[parentCode]) {
    const start = moment(activity.roundStartTime).tz(activity.timezone)
    const end = moment(activity.roundEndTime).tz(activity.timezone)
    const event = codes[0]
    
    daySchedule.assignments[parentCode] = {
      timeText: `${start.format('HH:mm')} - ${end.format('HH:mm')}`,
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
    }
  }

  const info = daySchedule.assignments[parentCode]
  const group = codes[2] || '-1'
  const code = assignment.assignmentCode

  if (code === 'competitor') {
    info.competing = parseInt(group.substring(1), 10)
    info.stationNumber = assignment.stationNumber
  } else if (code === 'staff-judge') {
    info.judging.push(group.substring(1))
  } else if (code === 'staff-runner') {
    info.running.push(group.substring(1))
  } else if (code === 'staff-scrambler') {
    info.scrambling.push(group.substring(1))
  }
}

export function buildPersonSchedule(person: Person, activities: Record<number, ProcessedActivity>): PersonScheduleInfo {
  const personalSchedule: Record<number, DaySchedule> = {}

  for (const assignment of person.assignments || []) {
    const activity = activities[assignment.activityId]
    if (!activity) continue

    const start = moment(activity.roundStartTime).tz(activity.timezone)
    const day = start.day()

    if (!personalSchedule[day]) {
      personalSchedule[day] = { day, sortTime: start.unix(), assignments: {}, sortedAssignments: [] }
    }

    processAssignment(assignment, activity, personalSchedule[day])
  }

  const sortedSchedule = Object.values(personalSchedule).sort((a, b) => a.sortTime - b.sortTime)
  sortedSchedule.forEach(ds => {
    ds.sortedAssignments = Object.values(ds.assignments).sort((a, b) => {
      if (a.sortTime !== b.sortTime) return a.sortTime - b.sortTime
      return a.eventCode.localeCompare(b.eventCode)
    })
  })

  return {
    blank: false,
    name: person.name,
    wcaid: person.wcaId ?? null,
    compid: person.registrantId,
    countryCode: person.countryIso2.toLowerCase(),
    personalSchedule,
    sortedSchedule,
  }
}

export function reorganizeActivities(wcif: Competition): Record<number, ProcessedActivity> {
  const activities: Record<number, ProcessedActivity> = {}

  for (const venue of wcif.schedule.venues) {
    for (const room of venue.rooms) {
      const roomColorRgb = hexToRgb(room.color)
      const roomColor: [number, number, number] = roomColorRgb
        ? [
            Math.floor((255 + roomColorRgb[0]) / 2),
            Math.floor((255 + roomColorRgb[1]) / 2),
            Math.floor((255 + roomColorRgb[2]) / 2),
          ]
        : [255, 255, 255]

      for (const activity of room.activities) {
        const base = {
          parentActivityCode: activity.activityCode,
          roundStartTime: activity.startTime,
          roundEndTime: activity.endTime,
          timezone: venue.timezone,
          roomName: room.name,
          roomColor,
        }

        activities[activity.id] = { id: activity.id, activityCode: activity.activityCode, ...base }

        for (const child of activity.childActivities) {
          activities[child.id] = { id: child.id, activityCode: child.activityCode, ...base }
        }
      }
    }
  }

  return activities
}

export function chooseFont(text: string): string {
  if (!text || text.length === 0) return 'NotoSans-Regular'

  const code = text.charCodeAt(0)

  if (code >= 0x0000 && code <= 0x052f) return 'NotoSans-Regular'
  if ((code >= 0x0600 && code <= 0x06ff) || (code >= 0x0750 && code <= 0x077f)) return 'NotoSansArabic'
  if (code >= 0x0e00 && code <= 0x0e7f) return 'NotoSansThai'
  if (code >= 0x0530 && code <= 0x058f) return 'NotoSansArmenian'
  if (code >= 0x10a0 && code <= 0x10ff) return 'NotoSansGeorgian'
  return 'NotoSansSC'
}

export function parseLocalName(text: string): { latinName: string; localName: string | null } {
  const match = text.match(/(.*)\\s*[(（](.+)[)）]/)
  if (match) return { latinName: match[1].trim(), localName: match[2].trim() }
  return { latinName: text, localName: null }
}

export function removeStageWord(text: string): string {
  return text.replace(/\bstages?\b/gi, '').replace(/\s+/g, ' ').trim()
}
