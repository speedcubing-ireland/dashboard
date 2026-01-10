import { useAuthenticatedQuery } from '@/hooks/use-authenticated-query'
import { getAllGroups, getGroup } from '@/services/gsuite/groups'

export const groupKeys = {
  all: ['groups'] as const,
  lists: () => [...groupKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...groupKeys.lists(), filters] as const,
  details: () => [...groupKeys.all, 'detail'] as const,
  detail: (id: string) => [...groupKeys.details(), id] as const,
}

export function useGroups(options?: { domain?: string }) {
  return useAuthenticatedQuery(groupKeys.list(options || {}), (token) => getAllGroups(token))
}

export function useGroup(groupKey: string) {
  return useAuthenticatedQuery(groupKeys.detail(groupKey), (token) => getGroup(token, groupKey), { enabled: !!groupKey })
}

