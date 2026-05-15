export type EmailProviderName = "console" | "resend" | "smtp"

export type SendEmailInput = {
  html: string
  subject: string
  text: string
  to: string
}

export type SendEmailProviderInput = SendEmailInput & {
  from: string
}

export type SendEmailResult = {
  messageId?: string
  provider: EmailProviderName
}

export type EmailProvider = {
  send: (input: SendEmailProviderInput) => Promise<SendEmailResult>
}

export type RenderedEmail = {
  html: string
  subject: string
  text: string
}
