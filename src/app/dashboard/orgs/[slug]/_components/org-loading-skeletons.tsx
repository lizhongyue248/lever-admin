import type { CSSProperties } from "react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type SkeletonBlockProps = {
  className?: string
  style?: CSSProperties
}

const tableRowKeys = ["table-row-1", "table-row-2", "table-row-3", "table-row-4", "table-row-5", "table-row-6"]
const mobileRowKeys = ["mobile-row-1", "mobile-row-2", "mobile-row-3", "mobile-row-4"]
const chartBars = [
  { height: 44, key: "chart-early" },
  { height: 68, key: "chart-growth" },
  { height: 52, key: "chart-mid" },
  { height: 76, key: "chart-rise" },
  { height: 58, key: "chart-recent" },
  { height: 86, key: "chart-current" }
]

const SkeletonBlock = ({ className, style }: SkeletonBlockProps) => (
  <div className={cn("animate-pulse rounded-md bg-muted-foreground/20 dark:bg-muted-foreground/25", className)} style={style} />
)

const SkeletonIcon = () => <SkeletonBlock className="size-10 rounded-lg" />

const SkeletonPagination = () => (
  <div className="mt-4 flex items-center justify-center gap-3">
    <SkeletonBlock className="size-8" />
    <SkeletonBlock className="h-4 w-10" />
    <SkeletonBlock className="size-8" />
  </div>
)

const SkeletonTableRows = ({ rows = 6 }: { rows?: number }) => (
  <div className="hidden rounded-lg border md:block">
    <div className="grid grid-cols-6 gap-4 border-b px-4 py-3">
      {["head-1", "head-2", "head-3", "head-4", "head-5", "head-6"].map((key) => (
        <SkeletonBlock className="h-3 w-16" key={key} />
      ))}
    </div>
    <div className="divide-y">
      {tableRowKeys.slice(0, rows).map((key) => (
        <div className="grid grid-cols-6 items-center gap-4 px-4 py-4" key={key}>
          <div className="space-y-2">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-3 w-32 max-w-full" />
          </div>
          <SkeletonBlock className="h-6 w-16" />
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-4 w-20" />
          <SkeletonBlock className="h-4 w-20" />
          <SkeletonBlock className="h-6 w-14 justify-self-end" />
        </div>
      ))}
    </div>
  </div>
)

const SkeletonMobileRows = ({ rows = 3 }: { rows?: number }) => (
  <div className="space-y-3 md:hidden">
    {mobileRowKeys.slice(0, rows).map((key) => (
      <div className="rounded-lg border p-4" key={key}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-32 max-w-full" />
            <SkeletonBlock className="h-3 w-44 max-w-full" />
          </div>
          <SkeletonBlock className="h-6 w-14" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {["meta-1", "meta-2", "meta-3", "meta-4"].map((key) => (
            <SkeletonBlock className="h-3 w-24 max-w-full" key={key} />
          ))}
        </div>
      </div>
    ))}
  </div>
)

const FilterSkeletonCard = ({ action = false }: { action?: boolean }) => (
  <Card className="rounded-lg py-0 shadow-sm">
    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <SkeletonBlock className="h-9 min-w-0 flex-1" />
      <SkeletonBlock className="h-9 w-full sm:w-36" />
      <SkeletonBlock className="h-9 w-full sm:w-40" />
      {action ? <SkeletonBlock className="size-9" /> : null}
    </CardContent>
  </Card>
)

export const OrgOverviewLoadingSkeleton = () => (
  <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {["members", "departments", "invites", "risk"].map((item) => (
        <Card className="rounded-lg shadow-sm" key={item}>
          <CardContent className="flex items-center justify-between p-5">
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-8 w-16" />
              <SkeletonBlock className="h-3 w-28" />
            </div>
            <SkeletonIcon />
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
      <Card className="rounded-lg shadow-sm">
        <CardHeader className="px-5">
          <SkeletonBlock className="h-5 w-20" />
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="h-64 rounded-lg bg-muted-foreground/[0.06] p-4 dark:bg-muted-foreground/[0.08]">
            <div className="flex h-full items-end gap-4">
              {chartBars.map((item) => (
                <SkeletonBlock className="flex-1 rounded-t-md" key={item.key} style={{ height: `${item.height}%` }} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-lg shadow-sm">
        <CardHeader className="px-5">
          <SkeletonBlock className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-3 px-5 pb-5">
          {["event-1", "event-2", "event-3", "event-4"].map((key) => (
            <div className="flex items-center gap-3 rounded-lg border p-3" key={key}>
              <SkeletonBlock className="size-4 rounded-full" />
              <SkeletonBlock className="h-4 w-36 max-w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  </div>
)

export const OrgInformationLoadingSkeleton = () => (
  <div className="grid gap-5 lg:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)]">
    <Card className="rounded-lg py-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3 px-5 pt-5 pb-0">
        <div className="space-y-2">
          <SkeletonBlock className="h-5 w-20" />
          <SkeletonBlock className="h-3 w-36" />
        </div>
        <SkeletonBlock className="size-8" />
      </CardHeader>
      <CardContent className="space-y-2 p-5">
        {["root", "department-a", "department-a-1", "department-b", "department-c"].map((key, index) => (
          <div className={cn("flex items-center gap-2 rounded-lg px-2 py-2", index === 0 ? "bg-muted-foreground/[0.06] dark:bg-muted-foreground/[0.08]" : "")} key={key}>
            <SkeletonBlock className={cn("size-4", index > 1 ? "ml-6" : index > 0 ? "ml-3" : "")} />
            <SkeletonBlock className="h-4 flex-1" />
            <SkeletonBlock className="h-4 w-8" />
          </div>
        ))}
      </CardContent>
    </Card>

    <Card className="rounded-lg py-0 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 px-5 pt-5 pb-0">
        <div className="space-y-2">
          <SkeletonBlock className="h-5 w-28" />
          <SkeletonBlock className="h-3 w-64 max-w-full" />
        </div>
        <SkeletonBlock className="size-8" />
      </CardHeader>
      <CardContent className="p-5">
        <SkeletonTableRows />
        <SkeletonMobileRows />
        <SkeletonPagination />
      </CardContent>
    </Card>
  </div>
)

export const OrgInviteLoadingSkeleton = () => (
  <div className="space-y-5">
    <FilterSkeletonCard action />
    <Card className="rounded-lg shadow-sm">
      <CardContent className="p-5">
        <SkeletonTableRows rows={5} />
        <SkeletonMobileRows rows={3} />
        <SkeletonPagination />
      </CardContent>
    </Card>
  </div>
)

export const OrgAuthLoadingSkeleton = () => (
  <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-3">
      {["sessions", "devices", "risk"].map((key) => (
        <Card className="rounded-lg shadow-sm" key={key}>
          <CardContent className="flex items-center justify-between p-5">
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-7 w-14" />
            </div>
            <SkeletonIcon />
          </CardContent>
        </Card>
      ))}
    </div>
    <FilterSkeletonCard />
    <Card className="rounded-lg shadow-sm">
      <CardContent className="p-5">
        <SkeletonTableRows rows={6} />
        <SkeletonMobileRows rows={3} />
        <SkeletonPagination />
      </CardContent>
    </Card>
  </div>
)

export const OrgSettingLoadingSkeleton = () => (
  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
    <Card className="rounded-lg shadow-sm">
      <CardHeader className="px-5">
        <SkeletonBlock className="h-5 w-20" />
      </CardHeader>
      <CardContent className="space-y-5 px-5 pb-5">
        <div className="grid gap-4 md:grid-cols-2">
          {["name", "slug", "logo", "id", "created", "departments"].map((key) => (
            <div className="space-y-2" key={key}>
              <SkeletonBlock className="h-4 w-16" />
              <SkeletonBlock className="h-9 w-full" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <SkeletonBlock className="h-9 w-16" />
          <SkeletonBlock className="h-9 w-16" />
        </div>
      </CardContent>
    </Card>

    <Card className="rounded-lg border-destructive/40 shadow-sm">
      <CardHeader className="px-5">
        <SkeletonBlock className="h-5 w-20" />
      </CardHeader>
      <CardContent className="divide-y px-5 pb-5">
        {["disable", "delete"].map((key) => (
          <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0" key={key}>
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-4 w-20" />
              <SkeletonBlock className="h-3 w-full max-w-64" />
            </div>
            <SkeletonBlock className="h-9 w-16" />
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
)
