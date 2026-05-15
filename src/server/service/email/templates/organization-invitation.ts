import "server-only"

import type { RenderedEmail } from "../types"
import { type EmailTemplateInfoRow, type EmailTemplateLayoutInput, renderEmailLayout, renderPlainTextEmail } from "./shared"

type OrganizationInvitationEmailInput = {
  departmentName?: string | null
  email: string
  expiresAt?: Date | null
  inviterEmail?: string | null
  inviterName?: string | null
  organizationName: string
  role: string
  url: string
}

const formatDateTime = (date: Date | null | undefined) => {
  if (!date) {
    return "未指定"
  }

  return `${new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai"
  }).format(date)} GMT+8`
}

export const renderOrganizationInvitationEmail = (input: OrganizationInvitationEmailInput): RenderedEmail => {
  const inviter = input.inviterName || input.inviterEmail || "组织管理员"
  const infoRows: EmailTemplateInfoRow[] = [
    { label: "组织", value: input.organizationName },
    { label: "角色", value: input.role },
    {
      label: "邀请人",
      value: input.inviterEmail ? `${inviter} · ${input.inviterEmail}` : inviter
    },
    { label: "接收邮箱", value: input.email },
    { label: "过期时间", value: formatDateTime(input.expiresAt) }
  ]

  if (input.departmentName) {
    infoRows.splice(1, 0, { label: "默认部门", value: input.departmentName })
  }

  const layoutInput = {
    actionLabel: "查看邀请",
    actionUrl: input.url,
    body: `${inviter} 邀请你以 ${input.role} 身份加入 ${input.organizationName}。接受后，你可以在 Lever Admin 中访问该组织授权给你的资源。`,
    infoRows,
    preview: `${input.organizationName} 邀请你加入。`,
    securityNote: "请确认邀请来自你信任的组织。接受邀请前，Lever Admin 会要求你登录并校验当前邮箱。",
    title: `${input.organizationName} 邀请你加入`
  } satisfies EmailTemplateLayoutInput

  return {
    html: renderEmailLayout(layoutInput),
    subject: `你被邀请加入 ${input.organizationName}`,
    text: renderPlainTextEmail(layoutInput)
  }
}
