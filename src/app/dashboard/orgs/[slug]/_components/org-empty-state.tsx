import { Building2 } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

type OrgEmptyStateProps = {
  description: string
  title: string
}

export const OrgEmptyState = ({ description, title }: OrgEmptyStateProps) => (
  <Card className="min-h-[360px] justify-center rounded-lg shadow-sm">
    <CardContent className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Building2 className="size-9" />
      </div>
      <div className="space-y-1">
        <h2 className="font-semibold text-base">{title}</h2>
        <p className="max-w-sm text-muted-foreground text-sm">{description}</p>
      </div>
    </CardContent>
  </Card>
)
