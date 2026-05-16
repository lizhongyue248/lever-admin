import { AlertTriangle, CheckCircle2, Clock3, ShieldAlert, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  API_KEY_DISPLAY_STATUSES,
  API_KEY_STATUS_DISABLED,
  API_KEY_STATUS_ENABLED,
  API_KEY_STATUS_EXPIRED,
  API_KEY_STATUS_EXPIRING,
  type ApiKeyDisplayStatus,
  RISK_LEVEL_HIGH,
  RISK_LEVEL_LOW,
  RISK_LEVEL_MEDIUM,
  RISK_LEVELS,
  type RiskSeverity
} from "@/lib/const"
import type { RouterOutputs } from "@/trpc/react"

type ApiKeyItem = RouterOutputs["apiKey"]["listMine"]["items"][number]
type ApiKeyStatus = ApiKeyItem["status"]
type ApiKeyRisk = ApiKeyItem["risk"]
type StatusBadgeConfig = { label: string; variant: "default" | "destructive" | "outline" | "secondary"; icon: typeof CheckCircle2 }

const enabledStatusConfig: StatusBadgeConfig = { icon: CheckCircle2, label: "启用中", variant: "secondary" }
const statusConfig: Record<ApiKeyDisplayStatus, StatusBadgeConfig> = {
  [API_KEY_STATUS_DISABLED]: { icon: XCircle, label: "已禁用", variant: "outline" },
  [API_KEY_STATUS_ENABLED]: enabledStatusConfig,
  [API_KEY_STATUS_EXPIRED]: { icon: XCircle, label: "已过期", variant: "destructive" },
  [API_KEY_STATUS_EXPIRING]: { icon: Clock3, label: "即将过期", variant: "outline" }
}

const riskConfig: Record<RiskSeverity, { label: string; variant: "default" | "destructive" | "outline" | "secondary"; icon: typeof ShieldAlert }> = {
  [RISK_LEVEL_HIGH]: { icon: ShieldAlert, label: "高风险", variant: "destructive" },
  [RISK_LEVEL_LOW]: { icon: CheckCircle2, label: "低风险", variant: "secondary" },
  [RISK_LEVEL_MEDIUM]: { icon: AlertTriangle, label: "中风险", variant: "outline" }
}

const isApiKeyDisplayStatus = (status: string): status is ApiKeyDisplayStatus => API_KEY_DISPLAY_STATUSES.some((item) => item === status)
const isRiskSeverity = (level: string): level is RiskSeverity => RISK_LEVELS.some((item) => item === level)

export const ApiKeyStatusBadge = ({ status }: { status: ApiKeyStatus }) => {
  const config = isApiKeyDisplayStatus(status) ? (statusConfig[status] ?? enabledStatusConfig) : enabledStatusConfig
  const Icon = config.icon

  return (
    <Badge variant={config.variant}>
      <Icon className="size-3" />
      {config.label}
    </Badge>
  )
}

export const ApiKeyRiskBadge = ({ risk }: { risk: ApiKeyRisk }) => {
  const config = riskConfig[isRiskSeverity(risk.level) ? risk.level : RISK_LEVEL_LOW]
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
