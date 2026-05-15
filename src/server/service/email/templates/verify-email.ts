import "server-only"

import type { RenderedEmail } from "../types"
import { type EmailTemplateLayoutInput, renderEmailLayout, renderPlainTextEmail } from "./shared"

type VerifyEmailInput = {
  email: string
  expiresInMinutes?: number
  name?: string | null
  url: string
}

export const renderVerifyEmail = ({ email, expiresInMinutes = 60, url }: VerifyEmailInput): RenderedEmail => {
  const layoutInput = {
    actionLabel: "验证邮箱",
    actionUrl: url,
    body: "点击下方按钮完成邮箱验证。验证完成后，你可以继续使用 Lever Admin 的身份、组织和权限管理能力。",
    infoRows: [
      { label: "验证邮箱", value: email },
      { label: "有效期", value: `${expiresInMinutes} 分钟` }
    ],
    preview: "确认你的 Lever Admin 邮箱地址。",
    securityNote: "如果不是你本人操作，可以忽略这封邮件。未验证前不会改变你的账号安全设置。",
    title: "确认你的邮箱地址"
  } satisfies EmailTemplateLayoutInput

  return {
    html: renderEmailLayout(layoutInput),
    subject: "验证你的 Lever Admin 邮箱",
    text: renderPlainTextEmail(layoutInput)
  }
}
