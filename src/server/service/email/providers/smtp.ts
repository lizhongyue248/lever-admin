import "server-only"

import nodemailer from "nodemailer"

import { env } from "@/env"
import { EMAIL_PROVIDER_SMTP } from "@/lib/const"

import type { EmailProvider } from "../types"

export const smtpEmailProvider: EmailProvider = {
  send: async (input) => {
    const smtp = input.config.smtp

    if (!smtp?.host || !smtp.user || !smtp.password) {
      throw new Error("SMTP host, user, and password are required when email provider is smtp.")
    }

    const transporter =
      env.NODE_ENV === "test"
        ? nodemailer.createTransport({
            buffer: true,
            streamTransport: true
          })
        : nodemailer.createTransport({
            auth: {
              pass: smtp.password,
              user: smtp.user
            },
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure
          })

    const result = await transporter.sendMail({
      from: input.from,
      html: input.html,
      subject: input.subject,
      text: input.text,
      to: input.to
    })

    return {
      messageId: result.messageId,
      provider: EMAIL_PROVIDER_SMTP
    }
  }
}
