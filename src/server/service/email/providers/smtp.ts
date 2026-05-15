import "server-only"

import nodemailer from "nodemailer"

import { env } from "@/env"

import type { EmailProvider } from "../types"

type SmtpTransporter = ReturnType<typeof nodemailer.createTransport>

let smtpTransporter: SmtpTransporter | undefined

const getSmtpTransporter = (): SmtpTransporter => {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
    throw new Error("SMTP_HOST, SMTP_USER, and SMTP_PASSWORD are required when EMAIL_PROVIDER is smtp.")
  }

  smtpTransporter ??= nodemailer.createTransport({
    auth: {
      pass: env.SMTP_PASSWORD,
      user: env.SMTP_USER
    },
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE
  })

  return smtpTransporter
}

export const smtpEmailProvider: EmailProvider = {
  send: async (input) => {
    const result = await getSmtpTransporter().sendMail({
      from: input.from,
      html: input.html,
      subject: input.subject,
      text: input.text,
      to: input.to
    })

    return {
      messageId: result.messageId,
      provider: "smtp"
    }
  }
}
