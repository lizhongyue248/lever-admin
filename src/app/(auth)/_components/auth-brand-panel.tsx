import { ShieldCheck } from "lucide-react"

import type { AuthPageKey } from "@/app/(auth)/_lib/auth-pages"
import { authPages } from "@/app/(auth)/_lib/auth-pages"

export const AuthBrandPanel = ({ page }: { page: AuthPageKey }) => {
  const content = authPages[page]

  return (
    <aside className="relative hidden min-h-screen w-[520px] shrink-0 overflow-hidden border-border border-r bg-muted lg:block">
      <div aria-hidden className="absolute inset-0 bg-center bg-cover opacity-100 transition-opacity dark:opacity-0" style={{ backgroundImage: `url(${content.imageLight})` }} />
      <div aria-hidden className="absolute inset-0 bg-center bg-cover opacity-0 transition-opacity dark:opacity-100" style={{ backgroundImage: `url(${content.imageDark})` }} />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background/25 dark:from-background/80 dark:via-background/65 dark:to-background/20"
      />
      <div className="relative z-10 flex min-h-screen flex-col px-16 py-14">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="font-bold text-sm">L</span>
            </div>
            <span className="font-medium text-lg">Lever Admin</span>
          </div>
          <div className="max-w-[390px] space-y-5">
            <h1 className="font-semibold text-4xl leading-tight">Technical identity control for modern teams</h1>
            <p className="text-muted-foreground text-sm leading-6">A focused admin console for authentication, organizations, user governance and API access.</p>
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <ShieldCheck className="size-4 text-primary" />
                <span>Better Auth native session and OAuth flows</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <ShieldCheck className="size-4 text-primary" />
                <span>Role, organization and security ready structure</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <span className="sr-only">{content.imageAlt}</span>
    </aside>
  )
}
