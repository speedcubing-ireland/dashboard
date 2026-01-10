import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useGSuiteAuthStore } from '@/stores/gsuite-auth'
import { getAllMembers, addMember, removeMember, updateMember } from '@/services/gsuite/members'
import { useAuthenticatedQuery } from '@/hooks/use-authenticated-query'
import { groupKeys } from '@/hooks/use-groups'

export function useMembers(groupKey: string | null) {
  const { accessToken } = useGSuiteAuthStore()
  const queryClient = useQueryClient()

  const query = useAuthenticatedQuery(
    ['gsuite', 'groups', groupKey, 'members'], 
    (token) => getAllMembers(token, groupKey!),
    { enabled: !!groupKey }
  )

  const createMutation = <T, A>(mutationFn: (token: string, args: A) => Promise<T>, keys: QueryKey[]) =>
    useMutation({
      mutationFn: async (args: A) => {
        if (!accessToken || !groupKey) throw new Error('No access token or group selected')
        return mutationFn(accessToken, args)
      },
      onSuccess: () => keys.forEach(key => queryClient.invalidateQueries({ queryKey: key })),
    })

  const memberKeys: QueryKey = ['gsuite', 'groups', groupKey, 'members']
  const groupListKeys = groupKeys.lists()
  const groupDetailKeys = groupKey ? groupKeys.detail(groupKey) : null

  return {
    ...query,
    addMember: createMutation(
      (token, args: { email: string; role: 'MEMBER' | 'OWNER' | 'MANAGER' }) => addMember(token, groupKey!, args),
      [memberKeys, groupListKeys, ...(groupDetailKeys ? [groupDetailKeys] : [])]
    ),
    updateMember: createMutation(
      (token, args: { memberEmail: string; role: 'MEMBER' | 'OWNER' | 'MANAGER' }) => updateMember(token, groupKey!, args.memberEmail, { role: args.role }),
      [memberKeys, ...(groupDetailKeys ? [groupDetailKeys] : [])]
    ),
    removeMember: createMutation(
      (token, email: string) => removeMember(token, groupKey!, email),
      [memberKeys, groupListKeys, ...(groupDetailKeys ? [groupDetailKeys] : [])]
    ),
  }
}

