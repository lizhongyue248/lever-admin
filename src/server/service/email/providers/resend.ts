import "server-only"

import { Resend } from "resend"

import { env } from "@/env"

import type { EmailProvider } from "../types"

let resendClient: Resend | undefined

const getResendClient = (): Resend => {
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER is resend.")
  }

  resendClient ??= new Resend(env.RESEND_API_KEY)

  return resendClient
}

export const resendEmailProvider: EmailProvider = {
  send: async (input) => {
    const { data, error } = await getResendClient().emails.send({
      from: input.from,
      html: input.html,
      subject: input.subject,
      text: input.text,
      to: input.to
    })

    if (error) {
      throw new Error(error.message)
    }

    return {
      messageId: data?.id,
      provider: "resend"
    }
  }
}
