import { useAuthenticatedQuery } from '@/hooks/use-authenticated-query'
import { getAllUsers } from '@/services/gsuite/users'

export function useUsers() {
  return useAuthenticatedQuery(['users'], (token) => getAllUsers(token))
}

