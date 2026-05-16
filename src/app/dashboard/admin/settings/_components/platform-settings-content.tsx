"use client"

import type { RouterOutputs } from "@/trpc/react"
import { EmailSettingsCard } from "./email-settings-card"
import { StorageSettingsCard } from "./storage-settings-card"

type EmailSettings = RouterOutputs["adminPlatformSetting"]["getEmailSettings"]
type StorageSettings = RouterOutputs["adminPlatformSetting"]["getStorageSettings"]

export const PlatformSettingsContent = ({ initialEmailSettings, initialStorageSettings }: { initialEmailSettings: EmailSettings; initialStorageSettings: StorageSettings }) => (
  <div className="min-w-0 space-y-5 text-[13px]">
    <div>
      <h1 className="font-bold text-2xl tracking-normal">平台设置</h1>
      <p className="mt-2 text-muted-foreground text-xs">管理邮件服务、文件存储与连通性测试。</p>
    </div>
    <EmailSettingsCard initialEmailSettings={initialEmailSettings} />
    <StorageSettingsCard initialStorageSettings={initialStorageSettings} />
  </div>
)
