import "server-only"

import type { EmailProvider } from "../types"

const extractActionUrl = (text: string) => {
  const match = text.match(/https?:\/\/\S+|\/invite\/\S+/u)

  return match?.[0] ?? null
}

export const consoleEmailProvider: EmailProvider = {
  send: async (input) => {
    console.info("[email:console]", {
      actionUrl: extractActionUrl(input.text),
      from: input.from,
      subject: input.subject,
      to: input.to
    })

    return {
      provider: "console"
    }
  }
}
