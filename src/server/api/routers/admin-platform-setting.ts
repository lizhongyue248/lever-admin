import { TRPCError } from "@trpc/server"

import { PLATFORM_ROLE_SUPER_ADMIN } from "@/lib/const"
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc"
import { sendEmail } from "@/server/service/email"
import { getEmailSettings, testEmailSchema, updateEmailSettings, updateEmailSettingsSchema } from "@/server/service/platform-settings"

const assertSuperAdmin = (role: string | null | undefined) => {
  if (role !== PLATFORM_ROLE_SUPER_ADMIN) {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要超级管理员权限。" })
  }
}

const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;")

const getTestEmailFailureMessage = (provider: "console" | "resend" | "smtp") => {
  if (provider === "smtp") {
    return "SMTP 连接失败，请检查主机、端口和凭据。"
  }

  if (provider === "resend") {
    return "Resend 发送失败，请检查 API Key 和发件人配置。"
  }

  return "测试邮件发送失败，请稍后重试。"
}

export const adminPlatformSettingRouter = createTRPCRouter({
  getEmailSettings: adminProcedure.query(async ({ ctx }) => {
    assertSuperAdmin(ctx.session.user.role)

    return getEmailSettings(ctx.db)
  }),

  sendTestEmail: adminProcedure.input(testEmailSchema).mutation(async ({ ctx, input }) => {
    assertSuperAdmin(ctx.session.user.role)

    const settings = await getEmailSettings(ctx.db)
    const operatorEmail = ctx.session.user.email
    const sentAt = new Date().toISOString()
    let result: Awaited<ReturnType<typeof sendEmail>>

    try {
      result = await sendEmail({
        html: `<p>这是一封 Lever Admin 测试邮件。</p><p>Provider：${escapeHtml(settings.provider)}</p><p>发送时间：${escapeHtml(sentAt)}</p><p>操作人：${escapeHtml(operatorEmail)}</p>`,
        subject: "Lever Admin 测试邮件",
        text: `这是一封 Lever Admin 测试邮件。\nProvider：${settings.provider}\n发送时间：${sentAt}\n操作人：${operatorEmail}`,
        to: input.to
      })
    } catch {
      throw new TRPCError({ code: "BAD_REQUEST", message: getTestEmailFailureMessage(settings.provider) })
    }

    return {
      messageId: result.messageId ?? null,
      provider: result.provider,
      success: true
    }
  }),

  updateEmailSettings: adminProcedure.input(updateEmailSettingsSchema).mutation(async ({ ctx, input }) => {
    assertSuperAdmin(ctx.session.user.role)

    return updateEmailSettings(ctx.db, input, ctx.session.user.id)
  })
})
