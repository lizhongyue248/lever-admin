import "server-only"

import { Resend } from "resend"

import type { EmailProvider } from "../types"

export const resendEmailProvider: EmailProvider = {
  send: async (input) => {
    if (!input.config.resendApiKey) {
      throw new Error("Resend API Key is required when email provider is resend.")
    }

    const { data, error } = await new Resend(input.config.resendApiKey).emails.send({
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
