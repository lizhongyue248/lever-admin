import "server-only"

import type { RenderedEmail } from "../types"
import { type EmailTemplateLayoutInput, renderEmailLayout, renderPlainTextEmail } from "./shared"

type ResetPasswordEmailInput = {
  email: string
  expiresInMinutes?: number
  name?: string | null
  url: string
}

export const renderResetPasswordEmail = ({ email, expiresInMinutes = 60, url }: ResetPasswordEmailInput): RenderedEmail => {
  const layoutInput = {
    actionLabel: "重置密码",
    actionUrl: url,
    body: "我们收到了重置密码请求。点击下方按钮设置新密码；完成后，当前账号的旧登录状态会按安全策略失效。",
    infoRows: [
      { label: "账号邮箱", value: email },
      { label: "链接有效期", value: `${expiresInMinutes} 分钟` }
    ],
    preview: "重置你的 Lever Admin 登录密码。",
    securityNote: "如果不是你本人请求，请忽略这封邮件，并检查账号安全设置。Lever Admin 不会通过邮件索要密码。",
    title: "重置登录密码"
  } satisfies EmailTemplateLayoutInput

  return {
    html: renderEmailLayout(layoutInput),
    subject: "重置你的 Lever Admin 密码",
    text: renderPlainTextEmail(layoutInput)
  }
}
