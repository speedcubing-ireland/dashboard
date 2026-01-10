import type { Group, GroupListResponse } from '@/types/gsuite'
import { adminRequest, fetchAll } from './client'

export function getAllGroups(accessToken: string): Promise<Group[]> {
  return fetchAll<Group>(
    async (token, params) => {
      const response = await adminRequest<GroupListResponse>('/groups', token, {
        params: params as Record<string, string | number | boolean | undefined>,
      })
      return {
        items: response.groups,
        nextPageToken: response.nextPageToken,
      }
    },
    accessToken,
    { customer: 'my_customer', maxResults: 200 },
  )
}


export function getGroup(
  accessToken: string,
  groupKey: string,
): Promise<Group> {
  return adminRequest<Group>(
    `/groups/${encodeURIComponent(groupKey)}`,
    accessToken,
  )
}

