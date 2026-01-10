import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GSuiteProtected } from '@/components/gsuite/protected-route'
import { GroupsTab } from '@/components/gsuite/groups-tab'
import { UsersTab } from '@/components/gsuite/users-tab'
import { SheetsSyncTab } from '@/components/gsuite/sheets-sync-tab'

import { useNavigate } from '@tanstack/react-router'
import { useGSuiteAuth } from '@/hooks/use-gsuite-auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { HugeiconsIcon } from '@hugeicons/react'
import { Logout01Icon } from '@hugeicons/core-free-icons'

import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function GSuitePage() {
  const { user, logout } = useGSuiteAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate({ to: '/gsuite/login' })
  }

  return (
    <GSuiteProtected>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Groups & Members</h1>
            <p className="text-muted-foreground">
              Manage users, groups, and sync memberships from Google Sheets
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                    {user?.name?.givenName?.[0] || user?.primaryEmail?.[0]?.toUpperCase() || 'U'}
                    {user?.name?.familyName?.[0]}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium leading-none">{user?.name?.fullName}</p>
                  {user?.isAdmin && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      Admin
                    </Badge>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout} 
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <HugeiconsIcon icon={Logout01Icon} className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Tabs defaultValue="groups" className="w-full">
          <TabsList>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="sync">Sheets Sync</TabsTrigger>
          </TabsList>
          <TabsContent value="groups" className="mt-6">
            <GroupsTab />
          </TabsContent>
          <TabsContent value="users" className="mt-6">
            <UsersTab />
          </TabsContent>
          <TabsContent value="sync" className="mt-6">
            <SheetsSyncTab />
          </TabsContent>
        </Tabs>
      </div>
    </GSuiteProtected>
  )
}
