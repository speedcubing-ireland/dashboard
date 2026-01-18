import {
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { SearchableTable } from "@/components/common/searchable-table";
import { Badge } from "@/components/ui/badge";
import { useUsers } from "@/hooks/use-users";
import type { GoogleUser } from "@/types/gsuite";

export function UsersTab() {
  const { data: users = [], isLoading } = useUsers();
  return (
    <SearchableTable<GoogleUser>
      title="Users"
      description="Directory of all GSuite users"
      data={users}
      keyExtractor={(u) => u.id}
      isLoading={isLoading}
      searchPlaceholder="Search users..."
      getSearchableText={(u) => `${u.primaryEmail} ${u.name.fullName}`}
      columns={[
        {
          header: "User",
          render: (user) => (
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <HugeiconsIcon
                  icon={UserIcon}
                  className="h-4 w-4 text-primary"
                />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium truncate">
                  {user.name.fullName}
                </span>
                {user.isAdmin && (
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    Admin
                  </Badge>
                )}
              </div>
            </div>
          ),
        },
        {
          header: "Email",
          render: (user) => (
            <span className="truncate max-w-xs">{user.primaryEmail}</span>
          ),
          className: "truncate max-w-xs",
        },
        {
          header: "Status",
          render: (user) =>
            user.suspended ? (
              <Badge variant="destructive" className="flex w-fit gap-1">
                <HugeiconsIcon icon={CancelCircleIcon} className="h-3 w-3" />{" "}
                Suspended
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-green-500/10 text-green-600 hover:bg-green-500/20 flex w-fit gap-1"
              >
                <HugeiconsIcon
                  icon={CheckmarkCircle01Icon}
                  className="h-3 w-3"
                />{" "}
                Active
              </Badge>
            ),
        },
        {
          header: "Last Login",
          render: (user) => (
            <span className="text-muted-foreground">
              {new Date(user.lastLoginTime).toLocaleDateString()}
            </span>
          ),
          className: "text-muted-foreground",
        },
      ]}
      emptyMessage="No users found"
    />
  );
}
