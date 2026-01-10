import { getAllGroups } from './groups'
import { addMember, getAllMembers, removeMember, updateMember } from './members'
import { getSpreadsheetWithData, type CellData, type SheetWithData } from './sheets'
import { getErrorMessage } from '@/utils/error'
import type {
  ComputedMembership,
  RoleAssignment,
  SyncPreview,
  SyncResult,
  TeamConfig,
} from '@/types/gsuite'

export const TEAM_CONFIG_SHEET = 'Team Configuration'
export const ROLES_DB_SHEET = 'Roles DB'

function extractEmailsFromCell(cell: CellData | undefined): string[] {
  if (!cell) return []

  const emails: string[] = []

  if (cell.chipRuns) {
    for (const run of cell.chipRuns) {
      const email = run.chip?.personProperties?.email
      if (email && !emails.includes(email)) {
        emails.push(email)
      }
    }
  }

  if (cell.hyperlink) {
    const email = extractEmailFromLink(cell.hyperlink)
    if (email && !emails.includes(email)) emails.push(email)
  }

  if (cell.textFormatRuns) {
    for (const run of cell.textFormatRuns) {
      const link = run.format?.link?.uri
      if (link) {
        const email = extractEmailFromLink(link)
        if (email && !emails.includes(email)) {
          emails.push(email)
        }
      }
    }
  }

  if (cell.formattedValue) {
    const textEmails = cell.formattedValue
      .split(/\s+/)
      .map((s) => s.trim())
      .filter((s) => s.includes('@') && !emails.includes(s))
    emails.push(...textEmails)
  }

  return emails
}

function extractEmailFromLink(link: string): string | null {
  if (link.startsWith('mailto:')) {
    return link.replace('mailto:', '').trim()
  }
  if (link.includes('@')) {
    return link.trim()
  }
  return null
}

function getCellValue(cell: CellData | undefined): string {
  return cell?.formattedValue?.trim() || ''
}

function parseTeamConfigFromGrid(sheet: SheetWithData | undefined): TeamConfig[] {
  if (!sheet?.data?.[0]?.rowData) return []

  const rows = sheet.data[0].rowData
  const teams: TeamConfig[] = []

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].values || []
    const teamName = getCellValue(cells[0])
    if (!teamName) continue

    const groupsCell = cells[4]
    const groups = extractEmailsFromCell(groupsCell)

    teams.push({
      teamName,
      shortName: getCellValue(cells[1]),
      leaderTitle: getCellValue(cells[2]),
      directorContact: getCellValue(cells[3]),
      groups,
    })
  }

  return teams
}

function parseRolesDbFromGrid(sheet: SheetWithData | undefined): RoleAssignment[] {
  if (!sheet?.data?.[0]?.rowData) return []

  const rows = sheet.data[0].rowData
  const roles: RoleAssignment[] = []

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].values || []
    const personCell = cells[0]
    const person = getCellValue(personCell)
    const role = getCellValue(cells[1])
    if (!person || !role) continue

    const emails = extractEmailsFromCell(personCell)
    const email = emails[0]

    const status = getCellValue(cells[2]).toLowerCase()
    if (status !== 'active') continue

    roles.push({
      person,
      email,
      role,
      status: 'Active',
      startDate: getCellValue(cells[3]),
      finishDate: getCellValue(cells[4]),
    })
  }

  return roles
}

function findTeamForRole(role: string, teams: TeamConfig[]): TeamConfig | undefined {
  const roleLower = role.toLowerCase()

  return teams.find((team) => {
    return (
      team.teamName.toLowerCase() === roleLower ||
      team.shortName.toLowerCase() === roleLower ||
      team.leaderTitle.toLowerCase() === roleLower ||
      (team.shortName && roleLower.includes(team.shortName.toLowerCase())) ||
      team.teamName.toLowerCase().includes(roleLower)
    )
  })
}

function determineMemberRole(_roleTitle: string): 'OWNER' | 'MANAGER' | 'MEMBER' {
  return 'MEMBER'
}

function computeMemberships(
  teams: TeamConfig[],
  roles: RoleAssignment[],
): ComputedMembership[] {
  const memberships: ComputedMembership[] = []

  for (const assignment of roles) {
    if (!assignment.email) {
      continue
    }

    const team = findTeamForRole(assignment.role, teams)
    if (!team || team.groups.length === 0) continue

    const memberEmail = assignment.email
    const memberRole = determineMemberRole(assignment.role)

    for (const groupEmail of team.groups) {
      memberships.push({
        groupEmail,
        memberEmail,
        role: memberRole,
        source: `${assignment.person} - ${assignment.role}`,
      })
    }
  }

  return memberships
}

function deduplicateMemberships(memberships: ComputedMembership[]): ComputedMembership[] {
  const roleRank = { OWNER: 3, MANAGER: 2, MEMBER: 1 }
  const map = new Map<string, ComputedMembership>()

  for (const m of memberships) {
    const key = `${m.groupEmail}:${m.memberEmail}`
    const existing = map.get(key)

    if (!existing || roleRank[m.role] > roleRank[existing.role]) {
      map.set(key, m)
    }
  }

  return Array.from(map.values())
}

export async function loadSheetData(
  accessToken: string,
  spreadsheetId: string,
): Promise<{
  teams: TeamConfig[]
  roles: RoleAssignment[]
  memberships: ComputedMembership[]
}> {
  const spreadsheet = await getSpreadsheetWithData(accessToken, spreadsheetId, [
    `'${TEAM_CONFIG_SHEET}'!A:E`,
    `'${ROLES_DB_SHEET}'!A:E`,
  ])

  const teamConfigSheet = spreadsheet.sheets.find(
    (s) => s.properties.title === TEAM_CONFIG_SHEET,
  )
  const rolesDbSheet = spreadsheet.sheets.find((s) => s.properties.title === ROLES_DB_SHEET)

  const teams = parseTeamConfigFromGrid(teamConfigSheet)
  const roles = parseRolesDbFromGrid(rolesDbSheet)
  const rawMemberships = computeMemberships(teams, roles)
  const memberships = deduplicateMemberships(rawMemberships)

  return { teams, roles, memberships }
}

export async function generateSyncPreview(
  accessToken: string,
  spreadsheetId: string,
): Promise<SyncPreview> {
  const preview: SyncPreview = {
    additions: [],
    removals: [],
    updates: [],
    unchanged: 0,
    errors: [],
  }

  try {
    const { memberships: desiredMemberships } = await loadSheetData(accessToken, spreadsheetId)

    const allGroups = await getAllGroups(accessToken)

    const emailToPrimaryGroup = new Map<string, string>()
    for (const group of allGroups) {
      const primary = group.email.toLowerCase()
      emailToPrimaryGroup.set(primary, primary)
      if (group.aliases) {
        for (const alias of group.aliases) {
          emailToPrimaryGroup.set(alias.toLowerCase(), primary)
        }
      }
    }

    const desiredMap = new Map<string, ComputedMembership>()
    for (const m of desiredMemberships) {
      const primaryGroup = emailToPrimaryGroup.get(m.groupEmail.toLowerCase())
      if (primaryGroup) {
        const key = `${primaryGroup}:${m.memberEmail.toLowerCase()}`
        desiredMap.set(key, { ...m, groupEmail: primaryGroup })
      }
    }

    const processedKeys = new Set<string>()

    for (const group of allGroups) {
      try {
        const currentMembers = await getAllMembers(accessToken, group.email)
        const groupEmailLower = group.email.toLowerCase()

        for (const member of currentMembers) {
          const memberEmailLower = member.email.toLowerCase()
          const key = `${groupEmailLower}:${memberEmailLower}`
          const desired = desiredMap.get(key)

          if (!desired) {
            preview.removals.push({
              groupEmail: group.email,
              memberEmail: member.email,
              action: 'remove',
              currentRole: member.role,
            })
          } else if (desired.role !== member.role) {
            preview.updates.push({
              groupEmail: group.email,
              memberEmail: member.email,
              action: 'update',
              currentRole: member.role,
              newRole: desired.role,
              source: desired.source,
            })
            processedKeys.add(key)
          } else {
            preview.unchanged++
            processedKeys.add(key)
          }
        }
      } catch (error) {
        preview.errors.push(`Failed to fetch members for ${group.email}: ${getErrorMessage(error)}`)
      }
    }

    for (const m of desiredMemberships) {
      const primaryGroup = emailToPrimaryGroup.get(m.groupEmail.toLowerCase())
      if (!primaryGroup) {
        preview.errors.push(`Group not found: ${m.groupEmail}`)
        continue
      }

      const key = `${primaryGroup}:${m.memberEmail.toLowerCase()}`
      if (!processedKeys.has(key)) {
        preview.additions.push({
          groupEmail: primaryGroup,
          memberEmail: m.memberEmail,
          action: 'add',
          newRole: m.role,
          source: m.source,
        })
      }
    }
  } catch (error) {
    preview.errors.push(`Failed to generate preview: ${getErrorMessage(error)}`)
  }

  return preview
}

export async function executeSync(
  accessToken: string,
  preview: SyncPreview,
  options: { additions: boolean; removals: boolean; updates: boolean },
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    added: 0,
    removed: 0,
    updated: 0,
    errors: [],
  }

  if (options.additions) {
    for (const change of preview.additions) {
      try {
        if (!change.newRole) {
          throw new Error(
            `Missing newRole for addition of ${change.memberEmail} in ${change.groupEmail}`,
          )
        }

        await addMember(accessToken, change.groupEmail, {
          email: change.memberEmail,
          role: change.newRole,
        })
        result.added++
      } catch (error) {
        result.errors.push(`Failed to add ${change.memberEmail} to ${change.groupEmail}: ${getErrorMessage(error)}`)
      }
    }
  }

  if (options.removals) {
    for (const change of preview.removals) {
      try {
        await removeMember(accessToken, change.groupEmail, change.memberEmail)
        result.removed++
      } catch (error) {
        result.errors.push(`Failed to remove ${change.memberEmail} from ${change.groupEmail}: ${getErrorMessage(error)}`)
      }
    }
  }

  if (options.updates) {
    for (const change of preview.updates) {
      try {
        if (!change.newRole) {
          throw new Error(
            `Missing newRole for update of ${change.memberEmail} in ${change.groupEmail}`,
          )
        }

        await updateMember(accessToken, change.groupEmail, change.memberEmail, {
          role: change.newRole,
        })
        result.updated++
      } catch (error) {
        result.errors.push(`Failed to update ${change.memberEmail} in ${change.groupEmail}: ${getErrorMessage(error)}`)
      }
    }
  }

  result.success = result.errors.length === 0
  return result
}
