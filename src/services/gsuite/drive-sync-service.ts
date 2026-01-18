import { driveRequest, fetchAll } from "./client";
import { type BatchRequest, executeBatchRequest } from "./drive";
import { getAllMembers } from "./members";

interface Drive {
  id: string;
  name: string;
}

interface Permission {
  id: string;
  type: string;
  role: string;
  emailAddress?: string;
}

interface PermissionListResponse {
  permissions?: Permission[];
  nextPageToken?: string;
}

export interface DrivePermissionChange {
  driveId: string;
  driveName: string;
  userEmail: string;
  action: "add" | "remove" | "update";
  currentRole?: string;
  newRole: string;
  sourceGroups: string[];
  enabled: boolean;
}

export interface DriveSyncPreview {
  changes: DrivePermissionChange[];
  unchanged: number;
  errors: string[];
}

export interface DriveGroupsPreview {
  drives: Array<{
    id: string;
    name: string;
    groups: Array<{
      email: string;
      name: string;
      role: string;
    }>;
  }>;
  errors: string[];
}

const ROLE_HIERARCHY: Record<string, number> = {
  organizer: 5,
  fileOrganizer: 4,
  writer: 3,
  commenter: 2,
  reader: 1,
};

const DEFAULT_EXCLUDED_EMAILS = ["laptop@speedcubingireland.com"];
const BATCH_SIZE = 100;
const UPDATE_BATCH_SIZE = 50;
const BATCH_DELAY_MS = 500;
const UPDATE_DELAY_MS = 200;

function normalizeEmail(email: string): string {
  return email.toLowerCase();
}

function formatError(error: unknown, defaultMessage: string): string {
  return error instanceof Error ? error.message : defaultMessage;
}

function getMaxRole(roles: string[]): string {
  if (roles.length === 0) return "reader";
  return roles.reduce((max, role) => {
    const maxLevel = ROLE_HIERARCHY[max] || 0;
    const roleLevel = ROLE_HIERARCHY[role] || 0;
    return roleLevel > maxLevel ? role : max;
  }, roles[0]);
}

async function getDriveInfo(
  accessToken: string,
  driveId: string,
): Promise<string> {
  try {
    const response = await driveRequest<Drive>(
      `/drives/${encodeURIComponent(driveId)}`,
      accessToken,
      {
        params: { useDomainAdminAccess: true },
      },
    );
    return response.name || "Unknown Drive";
  } catch {
    return "Unknown Drive";
  }
}

async function getDrivePermissions(
  accessToken: string,
  driveId: string,
): Promise<{ permissions: Permission[]; errors: string[] }> {
  const errors: string[] = [];
  try {
    const permissions = await fetchAll<Permission>(async (token, params) => {
      const response = await driveRequest<PermissionListResponse>(
        `/files/${encodeURIComponent(driveId)}/permissions`,
        token,
        {
          params: {
            supportsAllDrives: true,
            useDomainAdminAccess: true,
            pageSize: BATCH_SIZE,
            fields: "permissions(id,type,role,emailAddress),nextPageToken",
            ...params,
          },
        },
      );
      return {
        items: response.permissions,
        nextPageToken: response.nextPageToken,
      };
    }, accessToken);
    return { permissions, errors };
  } catch (error) {
    errors.push(
      `Failed to get permissions: ${formatError(error, "Unknown error")}`,
    );
    return { permissions: [], errors };
  }
}

function getUserPermissionsMap(permissions: Permission[]): Map<string, string> {
  const map = new Map<string, string>();
  permissions
    .filter((p) => p.type === "user" && p.emailAddress)
    .forEach((p) => {
      if (p.emailAddress) map.set(normalizeEmail(p.emailAddress), p.role);
    });
  return map;
}

function getUserPermissionObjectsMap(
  permissions: Permission[],
): Map<string, Permission> {
  const map = new Map<string, Permission>();
  permissions
    .filter((p) => p.type === "user" && p.emailAddress)
    .forEach((p) => {
      if (p.emailAddress) map.set(normalizeEmail(p.emailAddress), p);
    });
  return map;
}

async function getGroupMembers(
  accessToken: string,
  groupEmail: string,
): Promise<{ members: string[]; error?: string }> {
  try {
    const members = await getAllMembers(accessToken, groupEmail);
    return {
      members: members
        .filter((m) => m.type === "USER" && m.email)
        .map((m) => normalizeEmail(m.email ?? "")),
    };
  } catch (error) {
    return {
      members: [],
      error: `Failed to get members for group ${groupEmail}: ${formatError(error, "Unknown error")}`,
    };
  }
}

function calculateUserRolesFromGroups(
  groupPermissions: Permission[],
  groupMembersMap: Map<string, string[]>,
  excludedEmails: Set<string>,
): Map<string, { role: string; groups: string[] }> {
  const userRoles = new Map<string, { role: string; groups: string[] }>();

  for (const groupPerm of groupPermissions) {
    if (!groupPerm.emailAddress) continue;
    const groupEmail = normalizeEmail(groupPerm.emailAddress);
    const members = groupMembersMap.get(groupEmail) || [];

    for (const email of members) {
      if (excludedEmails.has(email)) continue;

      const existing = userRoles.get(email);
      if (!existing) {
        userRoles.set(email, { role: groupPerm.role, groups: [groupEmail] });
      } else {
        const roles = [existing.role, groupPerm.role];
        userRoles.set(email, {
          role: getMaxRole(roles),
          groups: [...existing.groups, groupEmail],
        });
      }
    }
  }

  return userRoles;
}

function generateChanges(
  driveId: string,
  driveName: string,
  userRoles: Map<string, { role: string; groups: string[] }>,
  currentUserPermissions: Map<string, string>,
  excludedEmails: Set<string>,
): DrivePermissionChange[] {
  const changes: DrivePermissionChange[] = [];

  for (const [email, { role: requiredRole, groups }] of userRoles.entries()) {
    const currentRole = currentUserPermissions.get(email);
    if (!currentRole) {
      changes.push({
        driveId,
        driveName,
        userEmail: email,
        action: "add",
        newRole: requiredRole,
        sourceGroups: groups,
        enabled: true,
      });
    } else if (currentRole !== requiredRole) {
      changes.push({
        driveId,
        driveName,
        userEmail: email,
        action: "update",
        currentRole,
        newRole: requiredRole,
        sourceGroups: groups,
        enabled: true,
      });
    }
  }

  for (const [email, currentRole] of currentUserPermissions.entries()) {
    if (!excludedEmails.has(email) && !userRoles.has(email)) {
      changes.push({
        driveId,
        driveName,
        userEmail: email,
        action: "remove",
        currentRole,
        newRole: "",
        sourceGroups: [],
        enabled: true,
      });
    }
  }

  return changes;
}

export async function generateDriveGroupsPreview(
  accessToken: string,
  driveIds: string[],
): Promise<DriveGroupsPreview> {
  const errors: string[] = [];
  const drivesData: DriveGroupsPreview["drives"] = [];

  const allGroupsMap = new Map<string, string>();
  try {
    const { getAllGroups } = await import("./groups");
    const groups = await getAllGroups(accessToken);
    groups.forEach((g) => {
      allGroupsMap.set(normalizeEmail(g.email), g.name || g.email);
    });
  } catch {}

  for (const driveId of driveIds) {
    try {
      const driveName = await getDriveInfo(accessToken, driveId);
      const { permissions, errors: permErrors } = await getDrivePermissions(
        accessToken,
        driveId,
      );
      errors.push(...permErrors);

      const groupPermissions = permissions
        .filter((p) => p.type === "group" && p.emailAddress)
        .map((p) => ({
          email: normalizeEmail(p.emailAddress ?? ""),
          name:
            allGroupsMap.get(normalizeEmail(p.emailAddress ?? "")) ||
            p.emailAddress ||
            "",
          role: p.role,
        }));

      drivesData.push({
        id: driveId,
        name: driveName,
        groups: groupPermissions,
      });
    } catch (error) {
      errors.push(
        `Failed to process drive ${driveId}: ${formatError(error, "Unknown error")}`,
      );
    }
  }

  return { drives: drivesData, errors };
}

export async function calculateUserChangesFromGroups(
  drivesGroups: DriveGroupsPreview,
  accessToken: string,
  excludedEmails: string[] = DEFAULT_EXCLUDED_EMAILS,
): Promise<DriveSyncPreview> {
  const errors: string[] = [];
  const changes: DrivePermissionChange[] = [];
  const excludedEmailsSet = new Set(excludedEmails.map(normalizeEmail));
  let totalUnchanged = 0;

  const allGroupEmails = new Set<string>();
  for (const drive of drivesGroups.drives) {
    for (const group of drive.groups) {
      allGroupEmails.add(normalizeEmail(group.email));
    }
  }

  const groupMembersCache = new Map<string, string[]>();
  for (const groupEmail of allGroupEmails) {
    const { members, error } = await getGroupMembers(accessToken, groupEmail);
    if (error) errors.push(error);
    groupMembersCache.set(groupEmail, members);
  }

  for (const drive of drivesGroups.drives) {
    try {
      const { permissions, errors: permErrors } = await getDrivePermissions(
        accessToken,
        drive.id,
      );
      errors.push(...permErrors);

      const currentUserPermissions = getUserPermissionsMap(permissions);

      const groupPermissions = drive.groups.map((g) => ({
        id: "",
        type: "group",
        role: g.role,
        emailAddress: g.email,
      }));

      const userRoles = calculateUserRolesFromGroups(
        groupPermissions,
        groupMembersCache,
        excludedEmailsSet,
      );
      const driveChanges = generateChanges(
        drive.id,
        drive.name,
        userRoles,
        currentUserPermissions,
        excludedEmailsSet,
      );
      changes.push(...driveChanges);

      const driveAddsAndUpdates = driveChanges.filter(
        (c) => c.action === "add" || c.action === "update",
      );
      totalUnchanged += Math.max(
        0,
        userRoles.size - driveAddsAndUpdates.length,
      );
    } catch (error) {
      errors.push(
        `Failed to calculate changes for drive ${drive.name}: ${formatError(error, "Unknown error")}`,
      );
    }
  }

  return {
    changes,
    unchanged: totalUnchanged,
    errors: [...drivesGroups.errors, ...errors],
  };
}

async function processBatch<T>(
  accessToken: string,
  items: T[],
  batchSize: number,
  createRequest: (item: T) => BatchRequest,
  onSuccess: (item: T) => void,
  onError: (item: T, error: string) => void,
  delayMs: number = BATCH_DELAY_MS,
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchRequests = batch.map(createRequest);
    try {
      const batchResults = await executeBatchRequest(
        accessToken,
        batchRequests,
      );
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const item = batch[j];
        if (result.status >= 200 && result.status < 300) {
          onSuccess(item);
        } else {
          const errorBody = JSON.parse(result.body || "{}").error || {};
          onError(item, errorBody.message || `HTTP ${result.status}`);
        }
      }
    } catch (error) {
      for (const item of batch) {
        onError(item, formatError(error, "Batch request failed"));
      }
    }

    if (i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export async function executeDriveSync(
  accessToken: string,
  preview: DriveSyncPreview | DriveGroupsPreview,
  options: { additions: boolean; removals: boolean; updates: boolean },
): Promise<{
  success: boolean;
  added: number;
  removed: number;
  updated: number;
  errors: string[];
}> {
  const syncPreview: DriveSyncPreview =
    "drives" in preview
      ? await calculateUserChangesFromGroups(preview, accessToken)
      : preview;

  const errors: string[] = [];
  let added = 0;
  let removed = 0;
  let updated = 0;

  const enabledChanges = syncPreview.changes.filter((c) => c.enabled);
  const changesByDrive = new Map<string, DrivePermissionChange[]>();

  for (const change of enabledChanges) {
    const driveChanges = changesByDrive.get(change.driveId) || [];
    driveChanges.push(change);
    changesByDrive.set(change.driveId, driveChanges);
  }

  for (const [driveId, driveChanges] of changesByDrive.entries()) {
    const { permissions } = await getDrivePermissions(accessToken, driveId);
    const permissionMap = getUserPermissionObjectsMap(permissions);

    if (options.additions) {
      const additions = driveChanges.filter((c) => c.action === "add");
      await processBatch(
        accessToken,
        additions,
        BATCH_SIZE,
        (change) => ({
          method: "POST",
          path: `/files/${encodeURIComponent(driveId)}/permissions`,
          params: {
            supportsAllDrives: true,
            sendNotificationEmail: false,
            useDomainAdminAccess: true,
          },
          body: JSON.stringify({
            type: "user",
            role: change.newRole,
            emailAddress: change.userEmail,
          }),
        }),
        () => added++,
        (change) =>
          errors.push(
            `Failed to add permission for ${change.userEmail} on ${change.driveName}`,
          ),
      );
    }

    if (options.updates) {
      const updates = driveChanges.filter(
        (c) =>
          c.action === "update" &&
          permissionMap.has(normalizeEmail(c.userEmail)),
      );

      for (let i = 0; i < updates.length; i += UPDATE_BATCH_SIZE) {
        const batch = updates.slice(i, i + UPDATE_BATCH_SIZE);

        await processBatch(
          accessToken,
          batch,
          UPDATE_BATCH_SIZE,
          (change) => {
            const normalizedEmail = normalizeEmail(change.userEmail);
            const existingPerm = permissionMap.get(normalizedEmail);
            if (!existingPerm) {
              throw new Error(`Permission not found for ${change.userEmail}`);
            }
            return {
              method: "DELETE",
              path: `/files/${encodeURIComponent(driveId)}/permissions/${encodeURIComponent(existingPerm.id)}`,
              params: { supportsAllDrives: true, useDomainAdminAccess: true },
            };
          },
          () => {},
          (change) =>
            errors.push(
              `Failed to delete old permission for ${change.userEmail} on ${change.driveName}`,
            ),
          UPDATE_DELAY_MS,
        );

        await new Promise((resolve) => setTimeout(resolve, UPDATE_DELAY_MS));

        await processBatch(
          accessToken,
          batch,
          UPDATE_BATCH_SIZE,
          (change) => ({
            method: "POST",
            path: `/files/${encodeURIComponent(driveId)}/permissions`,
            params: {
              supportsAllDrives: true,
              sendNotificationEmail: false,
              useDomainAdminAccess: true,
            },
            body: JSON.stringify({
              type: "user",
              role: change.newRole,
              emailAddress: change.userEmail,
            }),
          }),
          () => updated++,
          (change) =>
            errors.push(
              `Failed to add new permission for ${change.userEmail} on ${change.driveName}`,
            ),
          UPDATE_DELAY_MS,
        );

        if (i + UPDATE_BATCH_SIZE < updates.length) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }
    }

    if (options.removals) {
      const removals = driveChanges.filter(
        (c) =>
          c.action === "remove" &&
          permissionMap.has(normalizeEmail(c.userEmail)),
      );
      await processBatch(
        accessToken,
        removals,
        BATCH_SIZE,
        (change) => {
          const normalizedEmail = normalizeEmail(change.userEmail);
          const existingPerm = permissionMap.get(normalizedEmail);
          if (!existingPerm) {
            throw new Error(`Permission not found for ${change.userEmail}`);
          }
          return {
            method: "DELETE",
            path: `/files/${encodeURIComponent(driveId)}/permissions/${encodeURIComponent(existingPerm.id)}`,
            params: { supportsAllDrives: true, useDomainAdminAccess: true },
          };
        },
        () => removed++,
        (change) =>
          errors.push(
            `Failed to remove permission for ${change.userEmail} on ${change.driveName}`,
          ),
      );
    }
  }

  return { success: errors.length === 0, added, removed, updated, errors };
}

async function getUsersInGroups(
  accessToken: string,
  groupPermissions: Permission[],
  excludedEmails: Set<string>,
): Promise<{ users: Set<string>; errors: string[] }> {
  const users = new Set<string>();
  const errors: string[] = [];

  const uniqueGroupEmails = new Set(
    groupPermissions
      .filter((p) => p.emailAddress)
      .map((p) => normalizeEmail(p.emailAddress ?? "")),
  );

  const groupMembersCache = new Map<string, string[]>();
  for (const groupEmail of uniqueGroupEmails) {
    const { members, error } = await getGroupMembers(accessToken, groupEmail);
    if (error) {
      errors.push(error);
    } else {
      groupMembersCache.set(groupEmail, members);
    }
  }

  for (const groupPerm of groupPermissions) {
    if (!groupPerm.emailAddress) continue;
    const members =
      groupMembersCache.get(normalizeEmail(groupPerm.emailAddress)) || [];
    members.forEach((email) => {
      if (!excludedEmails.has(email)) users.add(email);
    });
  }

  return { users, errors };
}

export async function previewRemoveAllIndividualPermissions(
  accessToken: string,
  driveIds: string[],
  excludedEmails: string[] = DEFAULT_EXCLUDED_EMAILS,
): Promise<DriveSyncPreview> {
  const errors: string[] = [];
  const changes: DrivePermissionChange[] = [];
  const excludedEmailsSet = new Set(excludedEmails.map(normalizeEmail));

  for (const driveId of driveIds) {
    try {
      const driveName = await getDriveInfo(accessToken, driveId);
      const { permissions, errors: permErrors } = await getDrivePermissions(
        accessToken,
        driveId,
      );
      errors.push(...permErrors);

      const groupPermissions = permissions.filter(
        (p) => p.type === "group" && p.emailAddress,
      );
      const { users: usersInGroups, errors: memberErrors } =
        await getUsersInGroups(
          accessToken,
          groupPermissions,
          excludedEmailsSet,
        );
      errors.push(...memberErrors);

      for (const perm of permissions) {
        if (perm.type === "user" && perm.emailAddress) {
          const email = normalizeEmail(perm.emailAddress);
          if (usersInGroups.has(email)) {
            changes.push({
              driveId,
              driveName,
              userEmail: email,
              action: "remove",
              currentRole: perm.role,
              newRole: "",
              sourceGroups: [],
              enabled: true,
            });
          }
        }
      }
    } catch (error) {
      errors.push(
        `Failed to process drive ${driveId}: ${formatError(error, "Unknown error")}`,
      );
    }
  }

  return { changes, unchanged: 0, errors };
}

export async function removeAllIndividualPermissions(
  accessToken: string,
  driveIds: string[],
  excludedEmails: string[] = DEFAULT_EXCLUDED_EMAILS,
): Promise<{ success: boolean; removed: number; errors: string[] }> {
  const errors: string[] = [];
  let totalRemoved = 0;
  const excludedEmailsSet = new Set(excludedEmails.map(normalizeEmail));

  for (const driveId of driveIds) {
    try {
      const { permissions } = await getDrivePermissions(accessToken, driveId);
      const groupPermissions = permissions.filter(
        (p) => p.type === "group" && p.emailAddress,
      );
      const { users: usersInGroups, errors: memberErrors } =
        await getUsersInGroups(
          accessToken,
          groupPermissions,
          excludedEmailsSet,
        );
      errors.push(...memberErrors);

      const userPermissionsToRemove = permissions.filter(
        (p) =>
          p.type === "user" &&
          p.emailAddress &&
          usersInGroups.has(normalizeEmail(p.emailAddress)),
      );

      if (userPermissionsToRemove.length > 0) {
        await processBatch(
          accessToken,
          userPermissionsToRemove,
          BATCH_SIZE,
          (perm) => ({
            method: "DELETE",
            path: `/files/${encodeURIComponent(driveId)}/permissions/${encodeURIComponent(perm.id)}`,
            params: { supportsAllDrives: true, useDomainAdminAccess: true },
          }),
          () => totalRemoved++,
          (perm) =>
            errors.push(
              `Failed to remove individual permission for ${perm.emailAddress || "unknown user"}`,
            ),
        );
      }
    } catch (error) {
      errors.push(
        `Failed to process drive ${driveId}: ${formatError(error, "Unknown error")}`,
      );
    }
  }

  return { success: errors.length === 0, removed: totalRemoved, errors };
}
