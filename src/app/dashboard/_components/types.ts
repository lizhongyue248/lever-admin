import type { RouterOutputs } from "@/trpc/react"

export type DashboardShellData = RouterOutputs["dashboard"]["getShell"]
export type DashboardHomeData = RouterOutputs["dashboard"]["getHome"]
