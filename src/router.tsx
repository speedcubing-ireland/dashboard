import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { HomePage } from '@/routes/home'
import { BadgesPage } from '@/routes/badges'
import { CompetitionsPage } from '@/routes/competitions'
import { EventsPage } from '@/routes/events'
import { GSuitePage } from '@/routes/gsuite'
import { GSuiteGroupDetailsPage } from '@/routes/gsuite-group-details'
import { GSuiteLoginPage } from '@/routes/gsuite-login'
import { IconsPage } from '@/routes/icons'

const rootRoute = createRootRoute({
  component: () => (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

const badgesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/badges',
  component: BadgesPage,
})

const competitionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/competitions',
  component: CompetitionsPage,
})

const eventsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/events',
  component: EventsPage,
})

const gsuiteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/gsuite',
  component: GSuitePage,
})

const gsuiteLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/gsuite/login',
  component: GSuiteLoginPage,
})

const gsuiteGroupDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/gsuite/groups/$groupId',
  component: GSuiteGroupDetailsPage,
})

const iconsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/icons',
  component: IconsPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  badgesRoute,
  competitionsRoute,
  eventsRoute,
  gsuiteRoute,
  gsuiteLoginRoute,
  gsuiteGroupDetailsRoute,
  iconsRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
