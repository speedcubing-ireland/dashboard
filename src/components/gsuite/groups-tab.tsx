"use client";

import { ArrowRight01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { SearchableTable } from "@/components/common/searchable-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGroups } from "@/hooks/use-groups";
import type { Group } from "@/types/gsuite";

export function GroupsTab() {
  const { data: groups = [], isLoading } = useGroups();
  return (
    <SearchableTable<Group>
      title="Groups"
      description="Manage GSuite groups and members"
      data={groups}
      keyExtractor={(g) => g.id}
      isLoading={isLoading}
      searchPlaceholder="Search groups..."
      getSearchableText={(g) =>
        `${g.email} ${g.name || ""} ${g.description || ""}`
      }
      columns={[
        {
          header: "Name",
          render: (group) => (
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={UserGroupIcon}
                className="h-4 w-4 shrink-0 text-muted-foreground"
              />
              <span>{group.name}</span>
            </div>
          ),
          className: "font-medium",
        },
        { header: "Email", render: (group) => group.email },
        {
          header: "Description",
          render: (group) => (
            <span className="text-muted-foreground">
              {group.description || "—"}
            </span>
          ),
        },
        {
          header: "Members",
          render: (group) => (
            <Badge variant="secondary">
              {group.directMembersCount} members
            </Badge>
          ),
        },
        {
          header: "",
          render: (group) => (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/gsuite/groups/${group.id}`}>
                View{" "}
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  className="ml-2 h-4 w-4"
                />
              </Link>
            </Button>
          ),
          className: "w-[100px]",
        },
      ]}
      emptyMessage="No groups found"
    />
  );
}
