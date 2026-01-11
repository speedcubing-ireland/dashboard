import { Link, useRouterState } from '@tanstack/react-router'
import { HomeIcon, CalendarIcon, CubeIcon, SunIcon, MoonIcon, ComputerIcon, IdentityCardIcon, Settings01Icon, ImageIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

const navItems = [
  { title: 'Home', href: '/', icon: HomeIcon },
  { title: 'Badges', href: '/badges', icon: IdentityCardIcon },
  { title: 'Competitions', href: '/competitions', icon: CalendarIcon },
  { title: 'Events', href: '/events', icon: CubeIcon },
  { title: 'Icons', href: '/icons', icon: ImageIcon },
  { title: 'GSuite Admin', href: '/gsuite', icon: Settings01Icon },
]

function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-full justify-start gap-2 px-2">
          <HugeiconsIcon icon={SunIcon} strokeWidth={2} className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <HugeiconsIcon icon={MoonIcon} strokeWidth={2} className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="dark:hidden">Light</span>
          <span className="hidden dark:inline">Dark</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <HugeiconsIcon icon={SunIcon} strokeWidth={2} />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <HugeiconsIcon icon={MoonIcon} strokeWidth={2} />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <HugeiconsIcon icon={ComputerIcon} strokeWidth={2} />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouterState()
  const currentPath = router.location.pathname

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">SI</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">Dashboard</span>
              <span className="text-xs text-muted-foreground">Speedcubing Ireland</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={currentPath === item.href}>
                      <Link to={item.href}>
                        <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t p-2">
          <ThemeToggle />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}
