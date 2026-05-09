import type { ReactNode } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export const AuthCard = ({ children, className, description, title }: { children: ReactNode; className?: string; description: string; title: string }) => {
  return (
    <Card className={cn("gap-6 rounded-[10px] border-border bg-card py-0 shadow-black/10 shadow-xl dark:shadow-black/30", className)}>
      <CardHeader className="gap-3 px-6 pt-6 pb-0 sm:px-8 sm:pt-8">
        <div className="space-y-2">
          <CardTitle className="font-semibold text-2xl tracking-tight">{title}</CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">{children}</CardContent>
    </Card>
  )
}
