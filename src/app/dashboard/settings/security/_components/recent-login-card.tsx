import { CircleCheck, CircleDot, CircleOff, MonitorSmartphone } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { RouterOutputs } from "@/trpc/react"

type SecurityOverview = RouterOutputs["security"]["getOverview"]
type RecentLoginMethods = SecurityOverview["recentLoginMethods"]
type SecuritySessions = SecurityOverview["sessions"]

type RecentLoginCardProps = {
  methods: RecentLoginMethods
  sessions: SecuritySessions
}

const statusMeta = {
  active: {
    icon: CircleCheck,
    label: "已启用"
  },
  available: {
    icon: CircleDot,
    label: "可配置"
  },
  unconfigured: {
    icon: CircleOff,
    label: "未配置"
  }
}

const formatDate = (date: Date | null) => {
  if (!date) {
    return "暂无记录"
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(date)
}

const getDeviceText = (userAgent: string | null) => {
  if (!userAgent) {
    return "未知设备"
  }

  if (userAgent.includes("Mobile")) {
    return "移动端浏览器"
  }

  if (userAgent.includes("Chrome")) {
    return "Chrome 浏览器"
  }

  if (userAgent.includes("Firefox")) {
    return "Firefox 浏览器"
  }

  if (userAgent.includes("Safari")) {
    return "Safari 浏览器"
  }

  return "桌面浏览器"
}

export const RecentLoginCard = ({ methods, sessions }: RecentLoginCardProps) => (
  <Card className="gap-4 rounded-lg py-5">
    <CardHeader className="px-5">
      <CardTitle className="text-base">最近登录方式</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4 px-5">
      <div className="rounded-md border bg-background/60 p-3 dark:bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <MonitorSmartphone className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-xs">当前设备</p>
            <p className="truncate text-muted-foreground text-xs">{getDeviceText(sessions.current?.userAgent ?? null)}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">活跃会话</p>
            <p className="font-medium">{sessions.activeCount} 个</p>
          </div>
          <div>
            <p className="text-muted-foreground">创建时间</p>
            <p className="font-medium">{formatDate(sessions.current?.createdAt ?? null)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {methods.map((method) => {
          const Icon = statusMeta[method.status].icon

          return (
            <div className="rounded-md border bg-background/60 p-3 dark:bg-muted/20" key={method.label}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <Icon
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      method.status === "active" && "text-primary",
                      method.status === "available" && "text-muted-foreground",
                      method.status === "unconfigured" && "text-muted-foreground/70"
                    )}
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-xs">{method.label}</p>
                    <p className="mt-1 text-muted-foreground text-xs leading-5">{method.description}</p>
                  </div>
                </div>
                <Badge className="rounded-md" variant={method.status === "active" ? "default" : "secondary"}>
                  {statusMeta[method.status].label}
                </Badge>
              </div>
            </div>
          )
        })}
      </div>
    </CardContent>
  </Card>
)
