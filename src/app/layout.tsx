import "@/styles/globals.css"

import type { Metadata } from "next"
import { Geist } from "next/font/google"

import { Providers } from "@/app/_components/providers"

export const metadata: Metadata = {
  title: "Lever Admin",
  description: "Identity, organization, and access management powered by Better Auth.",
  icons: [{ rel: "icon", url: "/favicon.ico" }]
}

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans"
})

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={`${geist.variable}`} lang="zh-CN" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
