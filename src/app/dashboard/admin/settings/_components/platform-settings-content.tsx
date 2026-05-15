"use client"

import type { RouterOutputs } from "@/trpc/react"
import { EmailSettingsCard } from "./email-settings-card"

type EmailSettings = RouterOutputs["adminPlatformSetting"]["getEmailSettings"]

export const PlatformSettingsContent = ({ initialEmailSettings }: { initialEmailSettings: EmailSettings }) => (
  <div className="space-y-5 text-[13px]">
    <div>
      <h1 className="font-bold text-2xl tracking-normal">平台设置</h1>
      <p className="mt-2 text-muted-foreground text-xs">管理会影响整个平台运行行为的设置。</p>
    </div>
    <EmailSettingsCard initialEmailSettings={initialEmailSettings} />
  </div>
)
