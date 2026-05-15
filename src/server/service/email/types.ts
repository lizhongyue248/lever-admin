export type EmailProviderName = "console" | "resend" | "smtp"

export type SendEmailInput = {
  html: string
  subject: string
  text: string
  to: string
}

export type EmailProviderRuntimeConfig = {
  resendApiKey?: string
  smtp?: {
    host?: string
    password?: string
    port: number
    secure: boolean
    user?: string
  }
}

export type SendEmailProviderInput = SendEmailInput & {
  config: EmailProviderRuntimeConfig
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
