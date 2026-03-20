"use client";

import {
  CalendarIcon,
  ComputerIcon,
  CubeIcon,
  HomeIcon,
  IdentityCardIcon,
  ImageIcon,
  MoonIcon,
  Settings01Icon,
  SunIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";

const navItems = [
  { title: "Home", href: "/", icon: HomeIcon },
  { title: "Badges", href: "/badges", icon: IdentityCardIcon },
  { title: "Certificates", href: "/certificates", icon: IdentityCardIcon },
  { title: "Competitions", href: "/competitions", icon: CalendarIcon },
  { title: "Events", href: "/events", icon: CubeIcon },
  { title: "Calendar", href: "/calendar", icon: CalendarIcon },
  { title: "Icons", href: "/icons", icon: ImageIcon },
  { title: "GSuite Admin", href: "/gsuite", icon: Settings01Icon },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="w-full justify-start gap-2 px-2"
        disabled
      >
        <div className="size-4" />
        <span className="text-muted-foreground">Loading...</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-full justify-start gap-2 px-2"
        >
          {theme === "light" && (
            <HugeiconsIcon icon={SunIcon} strokeWidth={2} className="size-4" />
          )}
          {theme === "dark" && (
            <HugeiconsIcon icon={MoonIcon} strokeWidth={2} className="size-4" />
          )}
          {theme === "system" && (
            <HugeiconsIcon
              icon={ComputerIcon}
              strokeWidth={2}
              className="size-4"
            />
          )}

          <span className="capitalize">{theme}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <HugeiconsIcon icon={SunIcon} strokeWidth={2} />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <HugeiconsIcon icon={MoonIcon} strokeWidth={2} />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <HugeiconsIcon icon={ComputerIcon} strokeWidth={2} />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">
                SI
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">Dashboard</span>
              <span className="text-xs text-muted-foreground">
                Speedcubing Ireland
              </span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                    >
                      <Link href={item.href}>
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
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
