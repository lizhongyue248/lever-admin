import { AlertTriangle, CheckCircle2, Clock3, ShieldAlert, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { RouterOutputs } from "@/trpc/react"

type ApiKeyItem = RouterOutputs["apiKey"]["listMine"]["items"][number]
type ApiKeyStatus = ApiKeyItem["status"]
type ApiKeyRisk = ApiKeyItem["risk"]

const statusConfig: Record<ApiKeyStatus, { label: string; variant: "default" | "destructive" | "outline" | "secondary"; icon: typeof CheckCircle2 }> = {
  disabled: { icon: XCircle, label: "已禁用", variant: "outline" },
  enabled: { icon: CheckCircle2, label: "启用中", variant: "secondary" },
  expired: { icon: XCircle, label: "已过期", variant: "destructive" },
  expiring: { icon: Clock3, label: "即将过期", variant: "outline" }
}

const riskConfig: Record<ApiKeyRisk["level"], { label: string; variant: "default" | "destructive" | "outline" | "secondary"; icon: typeof ShieldAlert }> = {
  high: { icon: ShieldAlert, label: "高风险", variant: "destructive" },
  low: { icon: CheckCircle2, label: "低风险", variant: "secondary" },
  medium: { icon: AlertTriangle, label: "中风险", variant: "outline" }
}

export const ApiKeyStatusBadge = ({ status }: { status: ApiKeyStatus }) => {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant}>
      <Icon className="size-3" />
      {config.label}
    </Badge>
  )
}

export const ApiKeyRiskBadge = ({ risk }: { risk: ApiKeyRisk }) => {
  const config = riskConfig[risk.level]
  const Icon = config.icon

  return (
    <Badge variant={config.variant}>
      <Icon className="size-3" />
      {config.label}
    </Badge>
  )
}

export const ApiKeyEmptyState = () => (
  <div className="rounded-lg border border-dashed p-8 text-center">
    <h2 className="font-semibold text-sm">暂无 API Key</h2>
    <p className="mt-2 text-muted-foreground text-xs">创建第一个个人 API Key 后，它会显示在这里。明文只会在创建成功后展示一次。</p>
  </div>
)

export const ApiKeyErrorState = ({ message }: { message: string }) => (
  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm" role="alert">
    {message}
  </div>
)
