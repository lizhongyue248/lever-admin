"use client"

import { Check, ChevronUp, LogOut, Settings, ShieldCheck, UserRound } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { authClient } from "@/server/better-auth/client"
import { api } from "@/trpc/react"

import type { DashboardShellData } from "./types"

type DashboardUserMenuProps = {
  compact?: boolean
  data: DashboardShellData
}

const getFallback = (name: string, email: string) => {
  const source = name.trim() || email.trim()
  const [first = "L", second = "A"] = source
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "")
    .slice(0, 2)
    .split("")

  return `${first}${second}`.toUpperCase()
}

export const DashboardUserMenu = ({ compact = false, data }: DashboardUserMenuProps) => {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState("")
  const [pendingSignOut, setPendingSignOut] = useState(false)
  const setActiveOrganization = api.dashboard.setActiveOrganization.useMutation({
    onSuccess: () => {
      router.refresh()
    }
  })

  const handleSignOut = async () => {
    setErrorMessage("")
    setPendingSignOut(true)

    try {
      const { error } = await authClient.signOut()

      if (error) {
        setErrorMessage("退出登录失败，请稍后重试。")
        return
      }

      router.replace("/sign-in")
      router.refresh()
    } catch {
      setErrorMessage("退出登录服务暂时不可用。")
    } finally {
      setPendingSignOut(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`打开用户菜单，${data.user.name || "未命名用户"}，${data.user.email}`}
          className={cn(
            "h-auto w-full justify-start gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-2.5 py-2 text-left hover:bg-sidebar-accent",
            compact && "justify-center px-1.5"
          )}
          variant="ghost"
        >
          <Avatar className="size-9">
            {data.user.image ? <AvatarImage alt={data.user.name || data.user.email} src={data.user.image} /> : null}
            <AvatarFallback>{getFallback(data.user.name || "", data.user.email)}</AvatarFallback>
          </Avatar>
          <span className={cn("min-w-0 flex-1", compact && "hidden")}>
            <span className="block truncate font-medium text-sm">{data.user.name || "未命名用户"}</span>
            <span className="block truncate text-muted-foreground text-xs">{data.user.email}</span>
          </span>
          <ChevronUp className={cn("size-4 text-muted-foreground", compact && "hidden")} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80" side="top" sideOffset={10}>
        <DropdownMenuLabel className="flex items-center gap-3 px-3 py-2.5 font-normal">
          <Avatar className="size-10">
            {data.user.image ? <AvatarImage alt={data.user.name || data.user.email} src={data.user.image} /> : null}
            <AvatarFallback>{getFallback(data.user.name || "", data.user.email)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-sm">{data.user.name || "未命名用户"}</span>
            <span className="block truncate text-muted-foreground text-xs">{data.user.email}</span>
            <Badge className="mt-1 h-5 px-1.5 text-[10px]" variant={data.user.emailVerified ? "secondary" : "outline"}>
              {data.user.emailVerified ? "邮箱已验证" : "邮箱未验证"}
            </Badge>
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="px-3 text-muted-foreground text-xs">已加入组织</DropdownMenuLabel>
        <DropdownMenuGroup>
          {data.organizations.length > 0 ? (
            data.organizations.map((item) => (
              <DropdownMenuItem
                className="px-3 py-2"
                key={item.organizationId}
                onSelect={(event) => {
                  event.preventDefault()
                  setActiveOrganization.mutate({ organizationId: item.organizationId })
                }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{item.organizationName}</span>
                  <span className="block text-muted-foreground text-xs">{item.role}</span>
                </span>
                {data.activeOrganizationId === item.organizationId ? <Check className="size-4 text-primary" /> : null}
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem className="px-3 py-2 text-muted-foreground" disabled>
              暂无组织
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => router.push("/dashboard/settings/profile")}>
            <UserRound className="size-4" />
            个人资料
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push("/dashboard/settings/security")}>
            <ShieldCheck className="size-4" />
            安全设置
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push("/dashboard/orgs")}>
            <Settings className="size-4" />
            组织设置
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={pendingSignOut}
          onSelect={(event) => {
            event.preventDefault()
            void handleSignOut()
          }}
          variant="destructive"
        >
          <LogOut className="size-4" />
          {pendingSignOut ? "退出中..." : "退出登录"}
        </DropdownMenuItem>
        {errorMessage ? <p className="px-3 py-1 text-destructive text-xs">{errorMessage}</p> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
