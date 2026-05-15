import "server-only"

import { env } from "@/env"

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
  if (env.NODE_ENV === "production" && env.EMAIL_PROVIDER === "console") {
    throw new Error("EMAIL_PROVIDER=console is not allowed in production.")
  }

  const provider = await getProvider(env.EMAIL_PROVIDER)

  try {
    return await provider.send({
      ...input,
      from: env.EMAIL_FROM
    })
  } catch (error) {
    console.error("[email:send-failed]", {
      errorName: error instanceof Error ? error.name : "UnknownEmailError",
      provider: env.EMAIL_PROVIDER
    })

    throw error
  }
}
