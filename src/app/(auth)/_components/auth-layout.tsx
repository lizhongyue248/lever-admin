import type { ReactNode } from "react"

import { AuthBackButton } from "@/app/(auth)/_components/auth-back-button"
import { AuthBrandPanel } from "@/app/(auth)/_components/auth-brand-panel"
import type { AuthPageKey } from "@/app/(auth)/_lib/auth-pages"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

export const AuthLayout = ({
  backHref,
  backLabel,
  children,
  className,
  page
}: {
  backHref?: string
  backLabel?: string
  children: ReactNode
  className?: string
  page: AuthPageKey
}) => {
  return (
    <main className="relative flex min-h-screen bg-background text-foreground">
      <AuthBrandPanel page={page} />
      {backHref ? <AuthBackButton href={backHref} label={backLabel} /> : null}
      <ThemeToggle className="fixed top-6 right-6 z-20 lg:right-8" />
      <section className="flex min-h-screen flex-1 items-center justify-center px-6 pt-[88px] pb-8 lg:px-16 lg:py-20">
        <div className={cn("w-full max-w-[430px]", className)}>{children}</div>
      </section>
    </main>
  )
}
