"use client"

import { ThemeProvider } from "next-themes"

import { Toaster } from "@/components/ui/sonner"
import { TRPCReactProvider } from "@/trpc/react"

export const Providers = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TRPCReactProvider>{children}</TRPCReactProvider>
      <Toaster richColors />
    </ThemeProvider>
  )
}
