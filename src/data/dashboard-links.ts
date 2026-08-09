export const DASHBOARD_LINK_ICONS = [
  "identity-card",
  "calendar",
  "cube",
  "award",
] as const;

export type DashboardLinkIcon = (typeof DASHBOARD_LINK_ICONS)[number];

export interface DashboardLink {
  id: string;
  title: string;
  description: string;
  icon: DashboardLinkIcon;
  href: `/${string}`;
  actionLabel: string;
}

export interface DashboardLinksResponse {
  links: readonly DashboardLink[];
}

export const DASHBOARD_LINKS = [
  {
    id: "badges",
    title: "Badge Generator",
    description: "Generate badges for competitors' lanyards",
    icon: "identity-card",
    href: "/badges",
    actionLabel: "Open Generator",
  },
  {
    id: "certificates",
    title: "Certificates",
    description: "Open the WCA certificates site",
    icon: "identity-card",
    href: "/certificates",
    actionLabel: "Open Certificates",
  },
  {
    id: "competitions",
    title: "Competitions",
    description: "Upcoming competitions and their status",
    icon: "calendar",
    href: "/competitions",
    actionLabel: "View Competitions",
  },
  {
    id: "events",
    title: "Events",
    description: "Popularity of events at competitions",
    icon: "cube",
    href: "/events",
    actionLabel: "View Events",
  },
  {
    id: "calendar",
    title: "Calendar",
    description: "Subscribe to the Irish WCA competitions calendar",
    icon: "calendar",
    href: "/calendar",
    actionLabel: "Subscribe",
  },
  {
    id: "achievements",
    title: "Achievements",
    description: "View competitor achievements and badge progress",
    icon: "award",
    href: "/achievements",
    actionLabel: "Open Achievements",
  },
] as const satisfies readonly DashboardLink[];

export const DASHBOARD_LINKS_RESPONSE = {
  links: DASHBOARD_LINKS,
} satisfies DashboardLinksResponse;
