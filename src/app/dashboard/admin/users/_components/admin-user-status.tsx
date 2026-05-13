import { AlertCircle, Users } from "lucide-react"

import { Card } from "@/components/ui/card"

export const AdminUserEmptyState = () => (
  <Card className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border-dashed p-8 text-center text-muted-foreground text-sm">
    <Users className="size-8" />
    <div>暂无符合条件的用户。</div>
  </Card>
)

export const AdminUserErrorState = ({ message }: { message: string }) => (
  <Card className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border-destructive/40 p-8 text-center text-destructive text-sm">
    <AlertCircle className="size-8" />
    <div>{message}</div>
  </Card>
)
