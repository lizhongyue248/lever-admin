import "server-only"

import { env } from "@/env"
import { EMAIL_PROVIDER_CONSOLE, EMAIL_PROVIDER_RESEND, EMAIL_PROVIDER_SMTP } from "@/lib/const"
import { db } from "@/server/db"
import { getEffectiveEmailProviderConfig } from "@/server/service/platform-settings"

import type { EmailProvider, EmailProviderName, SendEmailInput, SendEmailResult } from "./types"

const getProvider = async (providerName: EmailProviderName): Promise<EmailProvider> => {
  switch (providerName) {
    case EMAIL_PROVIDER_CONSOLE:
      return (await import("./providers/console")).consoleEmailProvider
    case EMAIL_PROVIDER_RESEND:
      return (await import("./providers/resend")).resendEmailProvider
    case EMAIL_PROVIDER_SMTP:
      return (await import("./providers/smtp")).smtpEmailProvider
  }
}

export const sendEmail = async (input: SendEmailInput): Promise<SendEmailResult> => {
  const config = await getEffectiveEmailProviderConfig(db)

  if (env.NODE_ENV === "production" && config.provider === EMAIL_PROVIDER_CONSOLE) {
    throw new Error("Console email provider is not allowed in production.")
  }

  const provider = await getProvider(config.provider)

  try {
    return await provider.send({
      ...input,
      config: {
        resendApiKey: config.resendApiKey,
        smtp: config.smtp
      },
      from: config.from
    })
  } catch (error) {
    console.error("[email:send-failed]", {
      errorName: error instanceof Error ? error.name : "UnknownEmailError",
      provider: config.provider
    })

    throw error
  }
}
