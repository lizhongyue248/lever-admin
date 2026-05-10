import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { RouterOutputs } from "@/trpc/react"

type SessionHealth = RouterOutputs["session"]["listMine"]["health"]

type SessionHealthCardProps = {
  health: SessionHealth
}

export const SessionHealthCard = ({ health }: SessionHealthCardProps) => (
  <Card className="gap-4 rounded-lg py-5">
    <CardHeader className="px-5">
      <CardTitle className="text-base">会话健康</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4 px-5">
      <p className="text-muted-foreground text-xs leading-5">基于活跃会话数量、当前设备和最近活跃时间，快速判断账号是否存在异常登录迹象。</p>
      <div className="divide-y rounded-md border bg-background/60 dark:bg-muted/20">
        <div className="flex items-center justify-between gap-3 px-3 py-3">
          <span className="text-muted-foreground text-xs">高风险会话</span>
          <span className="font-semibold text-lg text-primary">{health.highRiskCount}</span>
        </div>
        <div className="flex items-center justify-between gap-3 px-3 py-3">
          <span className="text-muted-foreground text-xs">最近活跃</span>
          <span className="font-medium text-xs">{health.latestActivityLabel}</span>
        </div>
        <div className="flex items-center justify-between gap-3 px-3 py-3">
          <span className="text-muted-foreground text-xs">最长在线</span>
          <span className="font-medium text-xs">{health.longestOnlineLabel}</span>
        </div>
      </div>
    </CardContent>
  </Card>
)
