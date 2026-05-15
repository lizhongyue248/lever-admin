import "server-only"

import { env } from "@/env"
import { db } from "@/server/db"
import { getEffectiveEmailProviderConfig } from "@/server/service/platform-settings"

import type { EmailProvider, EmailProviderName, SendEmailInput, SendEmailResult } from "./types"

const getProvider = async (providerName: EmailProviderName): Promise<EmailProvider> => {
  switch (providerName) {
    case "console":
      return (await import("./providers/console")).consoleEmailProvider
    case "resend":
      return (await import("./providers/resend")).resendEmailProvider
    case "smtp":
      return (await import("./providers/smtp")).smtpEmailProvider
  }
}

export const sendEmail = async (input: SendEmailInput): Promise<SendEmailResult> => {
  const config = await getEffectiveEmailProviderConfig(db)

  if (env.NODE_ENV === "production" && config.provider === "console") {
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
