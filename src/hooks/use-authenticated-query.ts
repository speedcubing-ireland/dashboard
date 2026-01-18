import { type QueryKey, useQuery } from "@tanstack/react-query";
import { useGSuiteAuthStore } from "@/stores/gsuite-auth";

export function useAuthenticatedQuery<T, TKey extends QueryKey = QueryKey>(
  key: TKey,
  queryFn: (token: string) => Promise<T>,
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  const { accessToken } = useGSuiteAuthStore();
  return useQuery<T>({
    queryKey: key,
    queryFn: async () => {
      if (!accessToken) throw new Error("No access token");
      return queryFn(accessToken);
    },
    enabled: !!accessToken && (options.enabled ?? true),
    staleTime: options.staleTime ?? 5 * 60 * 1000,
  });
}
