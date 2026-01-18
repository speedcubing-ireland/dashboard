import type { GroupMember, MemberListResponse } from "@/types/gsuite";
import { adminRequest, fetchAll } from "./client";

const listMembers = (
  accessToken: string,
  groupKey: string,
  options: { pageToken?: string; maxResults?: number; roles?: string } = {},
) =>
  adminRequest<MemberListResponse>(
    `/groups/${encodeURIComponent(groupKey)}/members`,
    accessToken,
    { params: options },
  );

export const getAllMembers = (accessToken: string, groupKey: string) =>
  fetchAll<GroupMember>(
    (token, params) =>
      listMembers(token, groupKey, params).then((r) => ({
        items: r.members,
        nextPageToken: r.nextPageToken,
      })),
    accessToken,
  );

const memberUrl = (groupKey: string, memberKey?: string) =>
  `/groups/${encodeURIComponent(groupKey)}/members${memberKey ? `/${encodeURIComponent(memberKey)}` : ""}`;

export const addMember = (
  accessToken: string,
  groupKey: string,
  member: { email: string; role?: string; delivery_settings?: string },
) =>
  adminRequest<GroupMember>(memberUrl(groupKey), accessToken, {
    method: "POST",
    body: JSON.stringify({
      email: member.email,
      role: member.role || "MEMBER",
      delivery_settings: member.delivery_settings,
    }),
  });

export const updateMember = (
  accessToken: string,
  groupKey: string,
  memberKey: string,
  updates: { role?: string; delivery_settings?: string },
) =>
  adminRequest<GroupMember>(memberUrl(groupKey, memberKey), accessToken, {
    method: "PUT",
    body: JSON.stringify(updates),
  });

export const removeMember = (
  accessToken: string,
  groupKey: string,
  memberKey: string,
) =>
  adminRequest<void>(memberUrl(groupKey, memberKey), accessToken, {
    method: "DELETE",
  });
