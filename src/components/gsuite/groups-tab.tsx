import { Link } from '@tanstack/react-router'
import { useGroups } from '@/hooks/use-groups'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SearchableTable } from '@/components/common/searchable-table'
import { ArrowRight01Icon, UserGroupIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { Group } from '@/types/gsuite'

export function GroupsTab() {
  const { data: groups = [], isLoading } = useGroups()
  return (
    <SearchableTable<Group>
      title="Groups"
      description="Manage GSuite groups and members"
      data={groups}
      isLoading={isLoading}
      searchPlaceholder="Search groups..."
      getSearchableText={(g) => `${g.email} ${g.name || ''}`}
      columns={[
        { header: 'Name', render: (group) => <div className="flex items-center gap-2"><HugeiconsIcon icon={UserGroupIcon} className="h-4 w-4 shrink-0 text-muted-foreground" /><span>{group.name}</span></div>, className: 'font-medium' },
        { header: 'Email', render: (group) => group.email },
        { header: 'Members', render: (group) => <Badge variant="secondary">{group.directMembersCount} members</Badge> },
        { header: '', render: (group) => <Button variant="ghost" size="sm" asChild><Link to="/gsuite/groups/$groupId" params={{ groupId: group.id }}>View <HugeiconsIcon icon={ArrowRight01Icon} className="ml-2 h-4 w-4" /></Link></Button>, className: 'w-[100px]' },
      ]}
      emptyMessage="No groups found"
    />
  )
}
