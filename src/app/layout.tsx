import "@/styles/globals.css"

import type { Metadata } from "next"
import { Geist } from "next/font/google"

import { Providers } from "@/app/_components/providers"

export const metadata: Metadata = {
  title: "Lever Admin",
  description: "Identity, organization, and access management powered by Better Auth.",
  icons: {
    icon: [
      { media: "(prefers-color-scheme: light)", url: "/favicon.svg", type: "image/svg+xml" },
      { media: "(prefers-color-scheme: dark)", url: "/favicon-dark.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" }
    ],
    shortcut: [{ url: "/favicon.svg", type: "image/svg+xml" }]
  }
}

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans"
})

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <html className={`${geist.variable}`} lang="zh-CN" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

export default RootLayout
