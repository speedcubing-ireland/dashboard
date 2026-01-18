import {
  type QueryKey,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { groupKeys } from "@/hooks/use-groups";
import {
  addMember,
  getAllMembers,
  removeMember,
  updateMember,
} from "@/services/gsuite/members";
import { useGSuiteAuthStore } from "@/stores/gsuite-auth";

export function useMembers(groupKey: string | null) {
  const { accessToken } = useGSuiteAuthStore();
  const queryClient = useQueryClient();

  const query = useAuthenticatedQuery(
    ["gsuite", "groups", groupKey, "members"],
    (token) => getAllMembers(token, groupKey || ""),
    { enabled: !!groupKey },
  );

  const memberKeys: QueryKey = ["gsuite", "groups", groupKey, "members"];
  const groupListKeys = groupKeys.lists();
  const groupDetailKeys = groupKey ? groupKeys.detail(groupKey) : null;

  const addMemberMutation = useMutation({
    mutationFn: async (args: {
      email: string;
      role: "MEMBER" | "OWNER" | "MANAGER";
    }) => {
      if (!accessToken || !groupKey)
        throw new Error("No access token or group selected");
      return addMember(accessToken, groupKey, args);
    },
    onSuccess: () => {
      [
        memberKeys,
        groupListKeys,
        ...(groupDetailKeys ? [groupDetailKeys] : []),
      ].forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async (args: {
      memberEmail: string;
      role: "MEMBER" | "OWNER" | "MANAGER";
    }) => {
      if (!accessToken || !groupKey)
        throw new Error("No access token or group selected");
      return updateMember(accessToken, groupKey, args.memberEmail, {
        role: args.role,
      });
    },
    onSuccess: () => {
      [memberKeys, ...(groupDetailKeys ? [groupDetailKeys] : [])].forEach(
        (key) => {
          queryClient.invalidateQueries({ queryKey: key });
        },
      );
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!accessToken || !groupKey)
        throw new Error("No access token or group selected");
      return removeMember(accessToken, groupKey, email);
    },
    onSuccess: () => {
      [
        memberKeys,
        groupListKeys,
        ...(groupDetailKeys ? [groupDetailKeys] : []),
      ].forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });

  return {
    ...query,
    addMember: addMemberMutation,
    updateMember: updateMemberMutation,
    removeMember: removeMemberMutation,
  };
}
