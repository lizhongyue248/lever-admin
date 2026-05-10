import { dashboardRouter } from "@/server/api/routers/dashboard"
import { profileRouter } from "@/server/api/routers/profile"
import { securityRouter } from "@/server/api/routers/security"
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc"

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  dashboard: dashboardRouter,
  profile: profileRouter,
  security: securityRouter
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
