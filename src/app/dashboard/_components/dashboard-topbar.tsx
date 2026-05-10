"use client"

import { Menu } from "lucide-react"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

import { DashboardSidebar } from "./dashboard-sidebar"
import type { DashboardShellData } from "./types"

type DashboardTopbarProps = {
  collapsed: boolean
  data: DashboardShellData
  onToggleSidebar: () => void
}

const BreadcrumbLink = ({ children }: { children: ReactNode }) => <span className="text-muted-foreground text-xs sm:text-sm">{children}</span>

export const DashboardTopbar = ({ collapsed, data, onToggleSidebar }: DashboardTopbarProps) => {
  const [hydrated, setHydrated] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b bg-sidebar px-3 text-sidebar-foreground sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <Sheet onOpenChange={setOpen} open={open}>
          <SheetTrigger asChild>
            <Button aria-label="打开侧边栏" className={cn("inline-flex size-8 shrink-0 lg:hidden")} disabled={!hydrated} size="icon" type="button" variant="ghost">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-80 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground" side="left">
            <SheetHeader className="sr-only">
              <SheetTitle>导航</SheetTitle>
              <SheetDescription>打开移动端主导航</SheetDescription>
            </SheetHeader>
            <DashboardSidebar data={data} mobile />
          </SheetContent>
        </Sheet>

        <Button
          aria-label={collapsed ? "展开菜单栏" : "折叠菜单栏"}
          aria-pressed={collapsed}
          className="hidden lg:inline-flex"
          disabled={!hydrated}
          onClick={onToggleSidebar}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Menu className="size-5" />
        </Button>
        <Separator className="hidden h-5 sm:block" orientation="vertical" />
        <nav aria-label="面包屑" className="flex min-w-0 items-center gap-2">
          <BreadcrumbLink>首页</BreadcrumbLink>
          <span className="text-muted-foreground text-xs">/</span>
          <span className="truncate font-medium text-xs sm:text-sm">工作台</span>
        </nav>
      </div>

      <ThemeToggle blur start="top-right" variant="circle" />
    </header>
  )
}
