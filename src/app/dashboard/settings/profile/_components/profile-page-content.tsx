import { Clock3, IdCard, Info, type LucideIcon, ShieldCheck, UsersRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { RouterOutputs } from "@/trpc/react"
import { ProfileForm } from "./profile-form"

type ProfilePageData = RouterOutputs["profile"]["get"]

type ProfilePageContentProps = {
  data: ProfilePageData
}

const StatRow = ({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3 rounded-md border bg-background/60 px-3 py-2.5 dark:bg-muted/20">
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-3.5" />
      </span>
      <span className="truncate text-muted-foreground text-xs">{label}</span>
    </div>
    <span className="shrink-0 font-medium text-xs">{value}</span>
  </div>
)

export const ProfilePageContent = ({ data }: ProfilePageContentProps) => (
  <div className="space-y-5 text-[13px]">
    <div className="space-y-1">
      <h1 className="font-semibold text-2xl tracking-normal">个人资料</h1>
      <p className="max-w-2xl text-muted-foreground text-sm">维护你的基础身份信息。邮箱和用户 ID 作为身份凭证暂不支持在此页面修改。</p>
    </div>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,730px)_320px]">
      <ProfileForm user={data.user} />

      <div className="space-y-5">
        <Card className="gap-4 rounded-lg py-5">
          <CardHeader className="px-5">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">资料完整度</CardTitle>
              <Badge className="rounded-md" variant="secondary">
                {data.stats.completeness}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-5">
            <div className="h-2 rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${data.stats.completeness}%` }} />
            </div>
            <p className="text-muted-foreground text-xs leading-5">补齐名称、头像与邮箱验证状态后，后台中展示的身份信息会更完整。</p>
          </CardContent>
        </Card>

        <Card className="gap-4 rounded-lg py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-base">身份信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 px-5">
            <StatRow icon={ShieldCheck} label="邮箱状态" value={data.user.emailVerified ? "已验证" : "未验证"} />
            <StatRow icon={UsersRound} label="所属组织" value={`${data.stats.organizationCount} 个`} />
            <StatRow icon={Clock3} label="活跃会话" value={`${data.stats.activeSessionCount} 个`} />
            <StatRow icon={IdCard} label="用户编号" value={data.user.id.slice(0, 8)} />
          </CardContent>
        </Card>

        <Card className="gap-4 rounded-lg py-5">
          <CardHeader className="px-5">
            <div className="flex items-center gap-2">
              <Info className="size-4 text-primary" />
              <CardTitle className="text-base">保存规则</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 px-5 text-muted-foreground text-xs leading-5">
            <p>名称长度需保持在 2 到 32 个字符之间。</p>
            <p>头像暂不上传文件，只支持填写公开可访问的图片 URL。</p>
            <p>邮箱、用户 ID 与权限角色由身份系统维护，不能在此页直接修改。</p>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
)
