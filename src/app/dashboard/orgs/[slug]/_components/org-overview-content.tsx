"use client"

import { Activity, AlertTriangle, GitBranch, Mail, Users } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { RouterOutputs } from "@/trpc/react"

type OverviewData = RouterOutputs["org"]["management"]["getOverview"]

export const OrgOverviewContent = ({ data }: { data: OverviewData; slug: string }) => {
  const chartConfig = {
    value: {
      color: "var(--primary)",
      label: "成员"
    }
  } satisfies ChartConfig
  const stats = [
    { icon: Users, label: "成员", meta: "当前公司成员", value: data.stats.memberCount },
    { icon: GitBranch, label: "部门", meta: "组织架构节点", value: data.stats.departmentCount },
    { icon: Mail, label: "邀请", meta: "待处理邀请", value: data.stats.pendingInvitationCount },
    { icon: AlertTriangle, label: "异常", meta: "登录风险", value: data.stats.riskySessionCount }
  ]

  const maxGrowth = Math.max(...data.growth.map((item) => item.value), 1)
  const growthDescription = `成员增长趋势，${data.growth.map((item) => `${item.label} ${item.value} 名成员`).join("，")}`

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon

          return (
            <Card className="rounded-lg shadow-sm" key={item.label}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-muted-foreground text-xs">{item.label}</p>
                  <p className="mt-1 font-semibold text-3xl text-primary">{item.value}</p>
                  <p className="mt-1 text-muted-foreground text-xs">{item.meta}</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">成员增长</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer aria-label={growthDescription} className="h-64 w-full rounded-lg bg-muted/35 p-4" config={chartConfig} role="img">
              <AreaChart accessibilityLayer data={data.growth} margin={{ bottom: 4, left: -12, right: 12, top: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis axisLine={false} dataKey="label" tickLine={false} tickMargin={10} />
                <YAxis allowDecimals={false} axisLine={false} domain={[0, Math.max(maxGrowth, 1)]} tickLine={false} tickMargin={8} width={36} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} cursor={false} />
                <defs>
                  <linearGradient id="memberGrowthFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <Area dataKey="value" fill="url(#memberGrowthFill)" fillOpacity={1} name="成员" stroke="var(--color-value)" strokeWidth={2.5} type="monotone" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">待处理事项</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.events.map((event) => (
              <div className="flex items-center gap-3 rounded-lg border p-3" key={event.id}>
                <Activity className="size-4 text-primary" />
                <span>{event.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
