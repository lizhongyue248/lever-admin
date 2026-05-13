import { adminOrgRouter } from "@/server/api/routers/admin-org"
import { dashboardRouter } from "@/server/api/routers/dashboard"
import { notificationRouter } from "@/server/api/routers/notification"
import { orgRouter } from "@/server/api/routers/org"
import { profileRouter } from "@/server/api/routers/profile"
import { securityRouter } from "@/server/api/routers/security"
import { sessionRouter } from "@/server/api/routers/session"
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc"

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  adminOrg: adminOrgRouter,
  dashboard: dashboardRouter,
  notification: notificationRouter,
  org: orgRouter,
  profile: profileRouter,
  security: securityRouter,
  session: sessionRouter
})

// export type definition of API
export type AppRouter = typeof appRouter

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.example.someProcedure();
 */
export const createCaller = createCallerFactory(appRouter)
